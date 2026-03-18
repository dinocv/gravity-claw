import type { Agent } from "./agent.js";

export interface IncomingMessage {
    channel: string;
    userId: string;
    userName: string;
    text: string;
    reply: (text: string) => Promise<void>;
}

export interface Channel {
    name: string;
    init(): Promise<void>;
    sendMessage(to: string, text: string): Promise<void>;
}

export class MessageRouter {
    private agent: Agent;
    private channels: Map<string, Channel> = new Map();

    constructor(agent: Agent) {
        this.agent = agent;
    }

    registerChannel(channel: Channel) {
        this.channels.set(channel.name, channel);
        console.log(`📡 Channel registered: ${channel.name}`);
    }

    async handleIncoming(msg: IncomingMessage) {
        console.log(`📥 [${msg.channel}] Message from ${msg.userName}: ${msg.text.slice(0, 50)}`);

        try {
            // Process with agent
            const response = await this.agent.run(msg.text, msg.userId);

            // Send back
            if (response.text && response.text !== "__VOICE_MESSAGE_SENT__") {
                await msg.reply(response.text);
            }

            // Handle audio responses if any (simplified for now)
            // In a real router, we'd want channels to handle media specifically
        } catch (err) {
            console.error(`❌ Router error:`, err);
            await msg.reply("⚠️ Something went wrong processing your request.");
        }
    }

    getChannel(name: string): Channel | undefined {
        return this.channels.get(name);
    }
}
