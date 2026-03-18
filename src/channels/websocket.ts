import { WebSocketServer, WebSocket } from "ws";
import type { ChannelAdapter, ChannelMessage, ChannelResponse } from "./router.js";

interface WSClient {
    ws: WebSocket;
    userId: string;
    chatId?: string;
}

export class WebSocketChannel implements ChannelAdapter {
    type = "websocket" as const;
    private port: number;
    private wss?: WebSocketServer;
    private clients: Map<string, WSClient> = new Map();
    private messageHandler?: (msg: ChannelMessage) => Promise<void>;

    constructor(port: number = 8080) {
        this.port = port;
    }

    onMessage(handler: (msg: ChannelMessage) => Promise<void>): void {
        this.messageHandler = handler;
    }

    async start(): Promise<void> {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on("connection", (ws, req) => {
            const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const client: WSClient = { ws, userId: clientId };
            this.clients.set(clientId, client);

            console.log(`🔌 WebSocket client connected: ${clientId}`);

            ws.on("message", async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    const channelMsg: ChannelMessage = {
                        channel: "websocket",
                        userId: message.userId || clientId,
                        chatId: message.chatId,
                        content: message.content || message.text || "",
                        type: this.detectType(message),
                        metadata: message.metadata,
                        timestamp: Date.now(),
                    };

                    if (this.messageHandler && channelMsg.content) {
                        await this.messageHandler(channelMsg);
                    }
                } catch (err) {
                    console.error("❌ WebSocket message error:", err);
                }
            });

            ws.on("close", () => {
                this.clients.delete(clientId);
                console.log(`🔌 WebSocket client disconnected: ${clientId}`);
            });

            ws.on("error", (err) => {
                console.error(`❌ WebSocket error for ${clientId}:`, err);
                this.clients.delete(clientId);
            });

            ws.send(JSON.stringify({ type: "connected", clientId }));
        });

        console.log(`🔌 WebSocket channel listening on port ${this.port}`);
    }

    async stop(): Promise<void> {
        for (const [_, client] of this.clients) {
            client.ws.close();
        }
        this.clients.clear();
        
        if (this.wss) {
            return new Promise((resolve) => {
                this.wss!.close(() => {
                    console.log("🛑 WebSocket server stopped");
                    resolve();
                });
            });
        }
    }

    private detectType(message: any): "text" | "voice" | "image" | "file" {
        if (message.type === "voice" || message.voice) return "voice";
        if (message.type === "image" || message.image) return "image";
        if (message.type === "file" || message.file) return "file";
        return "text";
    }

    async send(response: ChannelResponse): Promise<void> {
        const message = JSON.stringify({
            type: response.type,
            content: response.content,
            userId: response.userId,
            chatId: response.chatId,
            metadata: response.metadata,
        });

        const client = Array.from(this.clients.values()).find(
            c => c.userId === response.userId || c.chatId === response.chatId
        );

        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
        } else {
            for (const [_, c] of this.clients) {
                if (c.ws.readyState === WebSocket.OPEN) {
                    c.ws.send(message);
                }
            }
        }
    }

    broadcast(response: ChannelResponse): void {
        const message = JSON.stringify({
            type: response.type,
            content: response.content,
            userId: response.userId,
        });

        for (const [_, client] of this.clients) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(message);
            }
        }
    }

    getConnectedClients(): number {
        return this.clients.size;
    }
}
