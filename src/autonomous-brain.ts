import type { Agent } from "./agent.js";
import type { Config } from "./config.js";

export interface ResearchTopic {
    topic: string;
    reason: string;
    priority: number;
}

export class AutonomousBrain {
    private agent: Agent;
    private config: Config;
    private isRunning: boolean = false;
    private researchInterval: NodeJS.Timeout | null = null;
    private insightInterval: NodeJS.Timeout | null = null;

    constructor(agent: Agent, config: Config) {
        this.agent = agent;
        this.config = config;
    }

    async start(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🧠 Autonomous Brain started");
        
        // Research every 30 minutes
        this.researchInterval = setInterval(() => {
            this.autonomousResearch();
        }, 30 * 60 * 1000);
        
        // Share insights every hour
        this.insightInterval = setInterval(() => {
            this.shareInsights();
        }, 60 * 60 * 1000);
        
        await this.initialLearning();
    }

    stop(): void {
        this.isRunning = false;
        if (this.researchInterval) clearInterval(this.researchInterval);
        if (this.insightInterval) clearInterval(this.insightInterval);
        console.log("🧠 Autonomous Brain stopped");
    }

    private async initialLearning(): Promise<void> {
        console.log("🧠 Learning about you...");
        
        try {
            const facts = await this.agent.memory.getAllFacts("default");
            console.log(`🧠 I know ${facts.length} facts about you`);
            
            if (facts.length > 0) {
                const summary = facts.slice(0, 10).map(f => f.fact).join(", ");
                console.log(`🧠 Key facts: ${summary}`);
            }
        } catch (err) {
            console.error("❌ Learning failed:", err);
        }
    }

    private async autonomousResearch(): Promise<void> {
        if (!this.isRunning) return;
        
        try {
            const facts = await this.agent.memory.getAllFacts("default");
            
            const topicsToResearch: ResearchTopic[] = [];
            
            for (const fact of facts) {
                const f = fact.fact.toLowerCase();
                
                if (f.includes("interested") || f.includes("want") || f.includes("goal") || f.includes("project")) {
                    topicsToResearch.push({
                        topic: f.replace("user is interested in", "").replace("user wants", "").replace("user is working on", "").trim(),
                        reason: "User interested",
                        priority: 3
                    });
                }
                
                if (f.includes("work") || f.includes("job")) {
                    topicsToResearch.push({
                        topic: f.replace("user works", "").replace("user's job", "").trim(),
                        reason: "Work related",
                        priority: 2
                    });
                }
            }
            
            // Always research trending tech/AI
            topicsToResearch.push({
                topic: "latest breakthroughs in AI agents and automation 2024",
                reason: "Stay current",
                priority: 1
            });
            
            if (topicsToResearch.length > 0) {
                const top = topicsToResearch.sort((a, b) => b.priority - a.priority)[0];
                console.log(`🔍 Autonomous research: ${top.topic}`);
                
                // Could trigger actual research here
            }
            
        } catch (err) {
            console.error("❌ Autonomous research error:", err);
        }
    }

    private async shareInsights(): Promise<void> {
        // This could send insights to user via Telegram
        // For now just logs - the heartbeat system handles notifications
        console.log("💡 Checking for insights to share...");
    }

    async learnFromUser(message: string): Promise<void> {
        await this.agent.memory.archiveTurn("default", "user", message);
        
        try {
            await (this.agent as any).extractor.extractFromRecent("default");
        } catch (err) {
            console.error("❌ Fact extraction error:", err);
        }
    }

    async getUserProfile(): Promise<string> {
        try {
            const facts = await this.agent.memory.getAllFacts("default");
            
            const byCategory: Record<string, string[]> = {};
            for (const fact of facts) {
                if (!byCategory[fact.category]) {
                    byCategory[fact.category] = [];
                }
                byCategory[fact.category].push(fact.fact);
            }
            
            let profile = "🧑 About you:\n";
            for (const [cat, items] of Object.entries(byCategory)) {
                profile += `\n${cat.toUpperCase()}:\n`;
                for (const item of items) {
                    profile += `- ${item}\n`;
                }
            }
            
            if (facts.length === 0) {
                profile = "I'm still learning about you. Tell me about yourself!";
            }
            
            return profile;
        } catch (err) {
            return "Could not load profile";
        }
    }

    async getConversationSummary(): Promise<string> {
        try {
            const recent = await this.agent.memory.getRecentContext("default", 20);
            const facts = await this.agent.memory.getAllFacts("default");
            
            return `Memory: ${facts.length} facts stored, ${recent.length} recent messages`;
        } catch {
            return "Unable to get summary";
        }
    }
}
