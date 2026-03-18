import type { LLM } from "./llm.js";
import type { MemoryManager } from "./memory.js";

export class FactExtractor {
    private llm: LLM;
    private memory: MemoryManager;

    constructor(memory: MemoryManager, llm: LLM) {
        this.memory = memory;
        this.llm = llm;
    }

    /**
     * Analyze recent history and extract any new facts that aren't already known.
     */
    async extractFromRecent(userId: string): Promise<void> {
        try {
            const recent = await this.memory.getRecentContext(userId, 5);
            if (recent.length < 2) return;

            const conversationText = recent
                .map(m => `${m.role.toUpperCase()}: ${m.content}`)
                .join("\n");

            const existingFacts = await this.memory.getAllFacts(userId);
            const existingText = existingFacts.map(f => f.fact).join("\n");

            const prompt = `
You are a memory processor for a personal AI agent called Gravity Claw.
Your goal is to extract CORE FACTS about the user from the provided conversation snippet.

EXISTING KNOWLEDGE:
${existingText || "(None)"}

CONVERSATION SNIPPET:
${conversationText}

TASK:
1. Identify any NEW and IMPORTANT facts about the user (preferences, names, bio, goals).
2. Ignore redundant info already in "EXISTING KNOWLEDGE".
3. Return a JSON array of objects: [{ "fact": "string", "category": "string" }]
4. If no new facts, return [].
5. Keep facts concise and specific.

Example: [{ "fact": "User's favorite color is crimson", "category": "preference" }]

JSON RESPONSE:
`;

            const response = await this.llm.chat({
                systemPrompt: "You are a surgical fact extractor. Output ONLY valid JSON.",
                messages: [{ role: "user", content: prompt }]
            });

            const content = response.message.content || "[]";
            const jsonStart = content.indexOf("[");
            const jsonEnd = content.lastIndexOf("]") + 1;
            const newFacts = JSON.parse(content.substring(jsonStart, jsonEnd));

            if (Array.isArray(newFacts)) {
                for (const item of newFacts) {
                    console.log(`🧠 [Background Fact] Extracted: ${item.fact}`);
                    await this.memory.rememberFact(userId, item.fact, item.category);
                }
            }
        } catch (err) {
            // Silently fail diagnostic
        }
    }
}
