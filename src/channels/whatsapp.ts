import path from 'node:path';
import fs from 'node:fs';
import { Channel, MessageRouter } from '../router.js';

/**
 * WhatsApp Channel via Baileys.
 * Requires @whiskeysockets/baileys to be installed.
 * Run: npm install @whiskeysockets/baileys pino @hapi/boom qrcode-terminal
 * Note: Baileys fetches its own git-dependent sub-packages - requires git on PATH.
 */
export class WhatsAppChannel implements Channel {
    public name = 'whatsapp';
    private sock: any = null;
    private router: MessageRouter;
    private stateDir: string;
    private available = false;

    constructor(router: MessageRouter) {
        this.router = router;
        this.stateDir = path.join(process.cwd(), 'sessions', 'whatsapp');
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }

    async init() {
        // Dynamically load dependencies to avoid crash if not installed
        let makeWASocket: any, DisconnectReason: any, useMultiFileAuthState: any,
            fetchLatestBaileysVersion: any, makeCacheableSignalKeyStore: any, pino: any, Boom: any;
        try {
            const baileys = await import('@whiskeysockets/baileys');
            makeWASocket = baileys.default;
            DisconnectReason = baileys.DisconnectReason;
            useMultiFileAuthState = baileys.useMultiFileAuthState;
            fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
            makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
            pino = (await import('pino')).default;
            Boom = (await import('@hapi/boom')).Boom;
            this.available = true;
        } catch (err) {
            console.warn('⚠️ WhatsApp (Baileys) not available. Run: npm install @whiskeysockets/baileys pino @hapi/boom');
            return;
        }

        const { state, saveCreds } = await useMultiFileAuthState(this.stateDir);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: true,
            logger: pino({ level: 'silent' })
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) this.init();
            } else if (connection === 'open') {
                console.log('✅ WhatsApp connection opened!');
            }
        });

        this.sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    if (!msg.key.fromMe && msg.message) {
                        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                        const remoteJid = msg.key.remoteJid;
                        const pushName = msg.pushName || 'Unknown';
                        if (text && remoteJid) {
                            await this.router.handleIncoming({
                                channel: this.name,
                                userId: remoteJid,
                                userName: pushName,
                                text,
                                reply: async (replyText: string) => {
                                    await this.sock.sendMessage(remoteJid, { text: replyText });
                                }
                            });
                        }
                    }
                }
            }
        });
    }

    async sendMessage(to: string, text: string) {
        if (!this.sock || !this.available) {
            throw new Error('WhatsApp not initialized. Install Baileys first.');
        }
        await this.sock.sendMessage(to, { text });
    }
}
