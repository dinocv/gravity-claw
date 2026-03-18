import cron from "node-cron";
import type { Agent } from "./agent.js";
import type { Bot } from "grammy";
import { InputFile } from "grammy";
import fs from "node:fs";

export class HeartbeatManager {
    private agent: Agent;
    private bot: Bot;
    private targetChatId: string;

    constructor(agent: Agent, bot: Bot, targetChatId: string) {
        this.agent = agent;
        this.bot = bot;
        this.targetChatId = targetChatId;
    }

    start() {
        console.log("💓 Heartbeat system active. Scheduled for 08:00 AM daily.");

        // Schedule: 8:00 AM every day
        // Format: minute hour day-of-month month day-of-week
        cron.schedule("0 8 * * *", async () => {
            await this.performCheckIn();
        });

        // Uncomment for testing (runs every minute)
        /*
        cron.schedule("* * * * *", async () => {
            console.log("💓 Heartbeat test trigger...");
            await this.performCheckIn();
        });
        */
    }

    private async performCheckIn() {
        try {
            console.log(`💓 [Heartbeat] Running proactive check-in for user ${this.targetChatId}...`);

            const proactivePrompt = "INTERNAL_SIGNAL: It is now 8:00 AM. Reach out to Jack for his daily accountability check-in. Ask if he tracked his weight and what his biggest goal is for today. Be direct, casual, and mirroring his vibe as per soul.md.";

            const response = await this.agent.run(proactivePrompt, this.targetChatId, false);

            if (response.text && response.text !== "(no response)") {
                await this.bot.api.sendMessage(this.targetChatId, response.text);
            }

            for (const audioPath of response.audioPaths) {
                try {
                    await this.bot.api.sendAudio(this.targetChatId, new InputFile(audioPath));
                } catch (err) {
                    console.error(`❌ Heartbeat failed to send voice: ${err}`);
                } finally {
                    if (fs.existsSync(audioPath)) {
                        fs.unlinkSync(audioPath);
                    }
                }
            }
        } catch (err) {
            console.error("❌ Heartbeat execution failed:", err);
        }
    }
}
