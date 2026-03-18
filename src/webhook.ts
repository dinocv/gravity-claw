import http from 'node:http';
import type { Agent } from './agent.js';

/**
 * Inbound webhook server - exposes HTTP endpoints for
 * external services (GitHub, Stripe, Zapier, etc.) to send events.
 */
export class WebhookServer {
    private server: http.Server;
    private agent: Agent;
    private port: number;
    private secret: string;

    constructor(agent: Agent, port = 3001) {
        this.agent = agent;
        this.port = port;
        this.secret = process.env.WEBHOOK_SECRET || '';
        this.server = http.createServer(this.handleRequest.bind(this));
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
        }

        // Read body
        const body = await new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks).toString()));
            req.on('error', reject);
        });

        // Validate secret if configured
        if (this.secret) {
            const providedSecret = req.headers['x-webhook-secret'] || req.headers['authorization']?.replace('Bearer ', '');
            if (providedSecret !== this.secret) {
                res.writeHead(401);
                res.end('Unauthorized');
                return;
            }
        }

        let payload: any;
        try {
            payload = JSON.parse(body);
        } catch {
            payload = { rawBody: body };
        }

        const urlPath = req.url || '/';
        console.log(`🔔 Webhook received on ${urlPath}:`, JSON.stringify(payload).slice(0, 100));

        // Route to agent
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));

        // Process asynchronously
        setTimeout(async () => {
            try {
                const prompt = `Incoming webhook event on ${urlPath}:\n${JSON.stringify(payload, null, 2)}\n\nAnalyze this event and take appropriate action or notify the user.`;
                await this.agent.run(prompt, 'webhook');
            } catch (err) {
                console.error('❌ Webhook processing error:', err);
            }
        }, 0);
    }

    start(): void {
        this.server.listen(this.port, () => {
            console.log(`🔔 Webhook server listening on port ${this.port}`);
        });
    }

    stop(): void {
        this.server.close();
    }
}
