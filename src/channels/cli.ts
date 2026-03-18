import * as readline from "readline";
import type { ChannelAdapter, ChannelMessage, ChannelResponse } from "./router.js";

export class CLIChannel implements ChannelAdapter {
    type = "cli" as const;
    private rl?: readline.Interface;
    private messageHandler?: (msg: ChannelMessage) => Promise<void>;
    private running: boolean = false;

    constructor() {}

    onMessage(handler: (msg: ChannelMessage) => Promise<void>): void {
        this.messageHandler = handler;
    }

    async start(): Promise<void> {
        this.running = true;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("\n💬 CLI Channel ready. Type your messages below.\n");

        await this.promptLoop();
    }

    private async promptLoop(): Promise<void> {
        if (!this.running || !this.rl) return;

        this.rl.question("> ", async (input) => {
            if (!this.running) return;

            const trimmed = input.trim();
            if (trimmed) {
                const message: ChannelMessage = {
                    channel: "cli",
                    userId: "cli-user",
                    content: trimmed,
                    type: "text",
                    timestamp: Date.now(),
                };

                if (this.messageHandler) {
                    await this.messageHandler(message);
                }
            }

            await this.promptLoop();
        });
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.rl) {
            this.rl.close();
        }
    }

    async send(response: ChannelResponse): Promise<void> {
        console.log(`\n🤖: ${response.content}\n`);
    }
}
