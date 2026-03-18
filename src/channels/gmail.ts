import type { Agent } from '../agent.js';
import type { Config } from '../config.js';
import { Channel } from '../router.js';

// Gmail integration - reads from env for credentials
// Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env
export class GmailChannel implements Channel {
    public name = 'gmail';
    private agent: Agent;
    private gmail: any;
    private config: Config;

    constructor(agent: Agent, config: Config) {
        this.agent = agent;
        this.config = config;
    }

    async init() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            console.warn('⚠️ Gmail: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN not set. Gmail disabled.');
            return;
        }

        try {
            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(clientId, clientSecret);
            auth.setCredentials({ refresh_token: refreshToken });
            this.gmail = google.gmail({ version: 'v1', auth });
            console.log('✅ Gmail channel connected.');
        } catch (err) {
            console.error('❌ Gmail init failed:', err);
        }
    }

    async sendMessage(to: string, text: string) {
        if (!this.gmail) throw new Error('Gmail not initialized');
        // Convert text to email body
        const subject = 'Message from Gravity Claw';
        const rawMessage = Buffer.from(
            `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain\r\n\r\n${text}`
        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        await this.gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });
    }

    /**
     * Fetch unread emails since a given date and process them
     */
    async pollUnread(): Promise<void> {
        if (!this.gmail) return;
        try {
            const res = await this.gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread label:inbox',
                maxResults: 5
            });

            const messages = res.data.messages || [];
            for (const msg of messages) {
                const detail = await this.gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id
                });
                const headers = detail.data.payload.headers;
                const from = headers.find((h: any) => h.name === 'From')?.value || 'unknown';
                const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
                const body = detail.data.snippet || '';

                console.log(`📧 New email from ${from}: ${subject}`);
                // Run through agent for summary/action
                const prompt = `New email from ${from}\nSubject: ${subject}\nContent: ${body}\n\nSummarize and suggest action.`;
                const response = await this.agent.run(prompt, 'gmail');
                console.log('🤖 Agent email summary:', response.text.slice(0, 100));

                // Mark as read
                await this.gmail.users.messages.modify({
                    userId: 'me',
                    id: msg.id,
                    requestBody: { removeLabelIds: ['UNREAD'] }
                });
            }
        } catch (err) {
            console.error('❌ Gmail poll failed:', err);
        }
    }
}
