import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ChannelAdapter, ChannelMessage, ChannelResponse } from "./router.js";

export class WebhookChannel implements ChannelAdapter {
    type = "webhook" as const;
    private app: Hono;
    private port: number;
    private messageHandler?: (msg: ChannelMessage) => Promise<void>;
    private server?: any;

    constructor(port: number = 3000) {
        this.app = new Hono();
        this.port = port;
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.app.use("/*", cors());
        
        this.app.get("/health", (c) => c.json({ status: "ok", channel: "webhook" }));
        
        this.app.post("/webhook", async (c) => {
            try {
                const body = await c.req.json();
                
                const message: ChannelMessage = {
                    channel: "webhook",
                    userId: body.userId || body.user_id || "anonymous",
                    chatId: body.chatId || body.chat_id,
                    content: body.message || body.text || body.content || "",
                    type: this.detectType(body),
                    metadata: body.metadata || body,
                    timestamp: Date.now(),
                };

                if (this.messageHandler && message.content) {
                    await this.messageHandler(message);
                }

                return c.json({ success: true });
            } catch (err) {
                console.error("❌ Webhook error:", err);
                return c.json({ success: false, error: String(err) }, 500);
            }
        });

        this.app.post("/voice", async (c) => {
            try {
                const body = await c.req.arrayBuffer();
                
                const message: ChannelMessage = {
                    channel: "webhook",
                    userId: "anonymous",
                    content: "[voice data]",
                    type: "voice",
                    metadata: { audioSize: body.byteLength },
                    timestamp: Date.now(),
                };

                if (this.messageHandler) {
                    await this.messageHandler(message);
                }

                return c.json({ success: true });
            } catch (err) {
                return c.json({ success: false, error: String(err) }, 500);
            }
        });
    }

    private detectType(body: any): "text" | "voice" | "image" | "file" {
        if (body.type === "voice" || body.voice) return "voice";
        if (body.type === "image" || body.image || body.photo) return "image";
        if (body.type === "file" || body.document) return "file";
        return "text";
    }

    onMessage(handler: (msg: ChannelMessage) => Promise<void>): void {
        this.messageHandler = handler;
    }

    async start(): Promise<void> {
        const { serve } = await import("@hono/node-server");
        this.server = serve({
            fetch: this.app.fetch,
            port: this.port,
        });
        console.log(`🌐 Webhook channel listening on port ${this.port}`);
    }

    async stop(): Promise<void> {
        if (this.server) {
            this.server.close();
        }
    }

    async send(response: ChannelResponse): Promise<void> {
        console.log(`📤 Webhook sending to ${response.userId}: ${response.content.slice(50)}...`);
    }

    getApp(): Hono {
        return this.app;
    }

    getPort(): number {
        return this.port;
    }
}
