import type { Config } from "./config.js";
import {
    LLM,
    type ChatMessage,
    type ToolDef,
    type ToolCall,
} from "./llm.js";
import { getSystemPrompt, getDeepThinkingPrompt, expandMessage } from "./prompt.js";
import { MemoryManager } from "./memory.js";
import { SemanticMemory } from "./semantic.js";
import { FactExtractor } from "./extract-facts.js";
import { registerMemoryTools } from "./tools/index.js";
import { KnowledgeGraph } from "./knowledge-graph.js";
import { DeepResearch } from "./tools/research.js";
import fs from "node:fs";
import path from "node:path";

export type ToolHandler = (input: Record<string, unknown>) => Promise<string>;

export class Agent {
    private llm: LLM;
    private maxIterations: number;
    public tools: Map<string, ToolHandler> = new Map();
    private toolDefinitions: ToolDef[] = [];
    private pendingAudioPaths: string[] = [];
    private thinkingLevel: "off" | "low" | "medium" | "high" = "medium";

    public memory: MemoryManager;
    public semantic: SemanticMemory;
    public knowledgeGraph: KnowledgeGraph;
    private extractor: FactExtractor;
    private research: DeepResearch;
    private config: Config;

    private conversationInsights: Map<string, string[]> = new Map();
    private learnedPatterns: Map<string, (input: string) => string> = new Map();

    constructor(config: Config) {
        this.config = config;
        this.llm = new LLM(config);
        this.maxIterations = config.agent.maxIterations;
        this.thinkingLevel = config.agent.thinkingLevel || "medium";

        this.memory = new MemoryManager(config);
        this.semantic = new SemanticMemory(config, this.llm);
        this.knowledgeGraph = new KnowledgeGraph(config);
        this.extractor = new FactExtractor(this.memory, this.llm);
        this.research = new DeepResearch(config);

        registerMemoryTools(this);
    }

    registerTool(definition: ToolDef, handler: ToolHandler): void {
        const name = definition.function.name;
        this.tools.set(name, handler);
        this.toolDefinitions.push(definition);
        console.log(`🔧 Tool registered: ${name}`);
    }

    setThinkingLevel(level: "off" | "low" | "medium" | "high"): void {
        this.thinkingLevel = level;
        console.log(`🧠 Thinking level set to: ${level}`);
    }

    async run(
        userMessage: string,
        telegramUserId: string = "default",
        isVoice: boolean = false,
        imageData?: string
    ): Promise<{ text: string; audioPaths: string[] }> {
        this.pendingAudioPaths = [];

        // Expand slang and short messages
        const expandedMessage = expandMessage(userMessage);
        if (expandedMessage !== userMessage) {
            console.log(`📝 Expanded: "${userMessage}" -> "${expandedMessage}"`);
        }

        const shouldResearch = this.shouldPerformDeepResearch(expandedMessage);
        let researchResults = "";

        if (shouldResearch) {
            console.log("🔍 User is asking something that requires research...");
            try {
                researchResults = await this.research.deepResearch(this.extractResearchTopic(userMessage), "deep");
            } catch (err) {
                console.error("Research failed:", err);
            }
        }

        const systemPrompt = getSystemPrompt();

        // Await archiving to ensure recent context fetch includes the new turn
        await this.memory.archiveTurn(telegramUserId, "user", userMessage).catch(console.error);

        const [recent, facts, semantic, kgRelated] = await Promise.all([
            this.memory.getRecentContext(telegramUserId, 6), // Reduced from 15 - smart loading
            this.memory.getAllFacts(telegramUserId),
            this.semantic.search(telegramUserId, userMessage, 2).catch(e => { // Reduced from 3
                console.error("❌ Semantic search failed:", e);
                return [];
            }),
            this.knowledgeGraph.searchEntities(userMessage.split(" ")[0]).catch(() => [])
        ]);

        const messages: ChatMessage[] = [];

        if (facts.length > 0) {
            messages.push({
                role: "system",
                content: `CORE KNOWLEDGE ABOUT USER:\n${facts.map(f => `- ${f.fact} (${f.category})`).join("\n")}`
            });
        }

        if (kgRelated.length > 0) {
            messages.push({
                role: "system",
                content: `RELATED KNOWLEDGE:\n${kgRelated.map((e: any) => `- ${e.name} (${e.type}): ${e.properties}`).join("\n")}`
            });
        }

        if (researchResults) {
            messages.push({
                role: "system",
                content: `RESEARCH RESULTS:\n${researchResults}`
            });
        }

        if (semantic.length > 0) {
            messages.push({
                role: "system",
                content: `RELEVANT ARCHIVED CONTEXT:\n${semantic.join("\n")}`
            });
        }

        // Add history (excluding the very latest one if it was already added by memory fetch)
        // Actually, let's just use recent and ensure it matches our expectation.
        recent.forEach((m, idx) => {
            // Check if it's the current message and we have an image
            if (idx === recent.length - 1 && imageData) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: m.content },
                        {
                            type: "image_url",
                            image_url: { url: `data:image/jpeg;base64,${imageData}` }
                        }
                    ]
                } as any);
            } else {
                messages.push({ role: m.role as any, content: m.content });
            }
        });

        if (isVoice) {
            messages.push({
                role: "system",
                content: "CRITICAL: The user sent a voice message. You MUST respond using the 'text_to_speech' tool to maintain the vocal identity of the conversation. Do NOT respond with plain text alone. Your response should consist of a call to 'text_to_speech' containing EVERYTHING you wish to say, and your final text response should be exactly the string '__VOICE_MESSAGE_SENT__'."
            });
        }

        let finalResponse = "";
        let iterations = 0;
        const maxIter = this.thinkingLevel === "high" ? this.maxIterations * 2 : this.maxIterations;

        // Check if we should use tools based on environment
        const useTools = process.env.DISABLE_TOOLS !== "true" && this.toolDefinitions.length > 0;

        for (let i = 0; i < maxIter; i++) {
            iterations = i;
            const response = await this.llm.chat({
                systemPrompt,
                messages,
                tools: useTools ? this.toolDefinitions : undefined,
            });

            const { message, finishReason } = response;

            if (!message.tool_calls || message.tool_calls.length === 0) {
                finalResponse = typeof message.content === "string" ? message.content : "";
                break;
            }

            messages.push(message);

            for (const toolCall of message.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                args.userId = telegramUserId;

                const result = await this.executeTool(toolCall, args);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result,
                });
            }
        }

        if (finalResponse) {
            this.memory.archiveTurn(telegramUserId, "assistant", finalResponse).catch(console.error);
            this.semantic.archiveTurn(telegramUserId, "assistant", finalResponse).catch(console.error);
            this.extractor.extractFromRecent(telegramUserId).catch(console.error);

            if (this.shouldLearn(userMessage, finalResponse)) {
                this.learnFromConversation(userMessage, finalResponse);
            }


            await this.knowledgeGraph.autoBuildFromText(telegramUserId, `${userMessage} ${finalResponse}`).catch(() => { });
            await this.persistPersistentMemory(telegramUserId);
        }

        return {
            text: finalResponse || "(no response)",
            audioPaths: this.pendingAudioPaths,
        };
    }

    private shouldPerformDeepResearch(message: string): boolean {
        const researchTriggers = [
            "what is", "how does", "how do", "explain", "tell me about",
            "research", "find information", "what's the best", "compare",
            "vs", "versus", "difference between", "learn about", "understand",
            "what are", "why is", "why does", "can you explain", "help me understand"
        ];

        const lower = message.toLowerCase();
        return researchTriggers.some(t => lower.includes(t));
    }

    private extractResearchTopic(message: string): string {
        const cleaned = message
            .replace(/^(what is|how does|explain|tell me about|research|find information)/i, "")
            .replace(/[?.,!]/g, "")
            .trim();

        return cleaned || message;
    }

    private shouldLearn(userMessage: string, assistantResponse: string): boolean {
        const importantPatterns = [
            "important", "remember", "never forget", "my name", "i am", "i'm",
            "preference", "i like", "i don't like", "i prefer", "always",
            "never", "only", "just me"
        ];

        const lower = userMessage.toLowerCase();
        return importantPatterns.some(p => lower.includes(p));
    }

    private learnFromConversation(userMessage: string, assistantResponse: string): void {
        const userId = "default";
        const insights = this.conversationInsights.get(userId) || [];

        const keyLearnings = this.extractKeyLearnings(userMessage, assistantResponse);
        insights.push(...keyLearnings);

        if (insights.length > 50) {
            insights.splice(0, insights.length - 50);
        }

        this.conversationInsights.set(userId, insights);

        for (const learning of keyLearnings) {
            this.memory.rememberFact(userId, learning, "learned").catch(() => { });
        }
    }

    private extractKeyLearnings(userMessage: string, assistantResponse: string): string[] {
        const learnings: string[] = [];

        const nameMatch = userMessage.match(/(?:my name|i am|i'm)\s+(\w+)/i);
        if (nameMatch && nameMatch[1]) {
            learnings.push(`User's name is ${nameMatch[1]}`);
        }

        const prefMatch = userMessage.match(/i (like|prefer|love|hate|don't like)\s+(.+)/i);
        if (prefMatch) {
            learnings.push(`User ${prefMatch[1]}s ${prefMatch[2]}`);
        }

        return learnings;
    }

    queueAudio(filePath: string): void {
        this.pendingAudioPaths.push(filePath);
    }

    private async executeTool(toolCall: ToolCall, args: any): Promise<string> {
        const name = toolCall.function.name;
        const handler = this.tools.get(name);

        if (!handler) {
            console.error(`  ❌ Unknown tool: ${name}`);
            return `Error: Unknown tool "${name}"`;
        }

        try {
            console.log(`  ⚙️  Running tool: ${name}`);
            return await handler(args);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`  ❌ Tool error (${name}): ${errMsg}`);
            return `Error: ${errMsg}`;
        }
    }

    private async persistPersistentMemory(userId: string): Promise<void> {
        try {
            const facts = await this.memory.getAllFacts(userId);
            const memoryPath = path.join(process.cwd(), "MEMORY.md");

            let content = "# Gravity Claw: Memory & Context Persistence\n\n";
            content += `*Last updated: ${new Date().toLocaleString()}*\n\n`;

            content += "## Known User Facts & Preferences\n";
            if (facts.length > 0) {
                const categories = Array.from(new Set(facts.map(f => f.category)));
                for (const cat of categories) {
                    content += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
                    facts.filter(f => f.category === cat).forEach(f => {
                        content += `- ${f.fact}\n`;
                    });
                    content += "\n";
                }
            } else {
                content += "- No facts recorded yet.\n";
            }

            content += "\n## Project Paths & Environment\n";
            content += `- Root: \`${process.cwd()}\`\n`;
            content += `- OS: \`${process.platform}\`\n`;

            await fs.promises.writeFile(memoryPath, content, "utf-8");
            console.log("🧠 MEMORY.md updated.");
        } catch (err) {
            console.error("❌ Failed to update MEMORY.md:", err);
        }
    }

    getResearch(): DeepResearch {
        return this.research;
    }

    getThinkingLevel(): string {
        return this.thinkingLevel;
    }
}
