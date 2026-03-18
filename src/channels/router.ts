import type { Agent } from "../agent.js";
import type { Config } from "../config.js";

export type ChannelType = "telegram" | "webhook" | "websocket" | "cli";

export interface ChannelMessage {
    channel: ChannelType;
    userId: string;
    chatId?: string;
    content: string;
    type: "text" | "voice" | "image" | "file";
    metadata?: Record<string, unknown>;
    timestamp: number;
}

export interface ChannelResponse {
    channel: ChannelType;
    userId: string;
    chatId?: string;
    content: string;
    type: "text" | "voice" | "image" | "file";
    metadata?: Record<string, unknown>;
}

export interface ChannelAdapter {
    type: ChannelType;
    send(response: ChannelResponse): Promise<void>;
    onMessage(handler: (msg: ChannelMessage) => Promise<void>): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}

export class MultiChannelRouter {
    private channels: Map<ChannelType, ChannelAdapter> = new Map();
    private agent: Agent;
    private config: Config;
    private handlers: Map<ChannelType, (msg: ChannelMessage) => Promise<void>> = new Map();

    constructor(agent: Agent, config: Config) {
        this.agent = agent;
        this.config = config;
    }

    registerChannel(adapter: ChannelAdapter): void {
        this.channels.set(adapter.type, adapter);
        adapter.onMessage(async (msg) => {
            await this.routeMessage(msg);
        });
        console.log(`📡 Channel registered: ${adapter.type}`);
    }

    async start(): Promise<void> {
        for (const [type, channel] of this.channels) {
            try {
                await channel.start();
                console.log(`✅ Channel started: ${type}`);
            } catch (err) {
                console.error(`❌ Channel failed to start: ${type}`, err);
            }
        }
    }

    async stop(): Promise<void> {
        for (const [type, channel] of this.channels) {
            try {
                await channel.stop();
                console.log(`🛑 Channel stopped: ${type}`);
            } catch (err) {
                console.error(`❌ Error stopping channel: ${type}`, err);
            }
        }
    }

    private async routeMessage(msg: ChannelMessage): Promise<void> {
        console.log(`📨 Message from ${msg.channel}: ${msg.content.slice(0, 50)}...`);
        
        try {
            const response = await this.agent.run(
                msg.content,
                `${msg.channel}:${msg.userId}`,
                msg.type === "voice"
            );

            const channel = this.channels.get(msg.channel);
            if (channel) {
                await channel.send({
                    channel: msg.channel,
                    userId: msg.userId,
                    chatId: msg.chatId,
                    content: response.text,
                    type: "text",
                });

                for (const audioPath of response.audioPaths) {
                    await channel.send({
                        channel: msg.channel,
                        userId: msg.userId,
                        chatId: msg.chatId,
                        content: audioPath,
                        type: "voice",
                    });
                }
            }
        } catch (err) {
            console.error(`❌ Error routing message:`, err);
            
            const channel = this.channels.get(msg.channel);
            if (channel) {
                await channel.send({
                    channel: msg.channel,
                    userId: msg.userId,
                    chatId: msg.chatId,
                    content: "⚠️ Something went wrong processing your message.",
                    type: "text",
                });
            }
        }
    }

    async sendToChannel(channelType: ChannelType, response: ChannelResponse): Promise<void> {
        const channel = this.channels.get(channelType);
        if (!channel) {
            throw new Error(`Channel not found: ${channelType}`);
        }
        await channel.send(response);
    }

    getChannel(channelType: ChannelType): ChannelAdapter | undefined {
        return this.channels.get(channelType);
    }

    getActiveChannels(): ChannelType[] {
        return Array.from(this.channels.keys());
    }
}
