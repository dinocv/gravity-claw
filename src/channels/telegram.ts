import { Bot } from 'grammy';
import { Channel, MessageRouter } from '../router.js';
import type { Config } from '../config.js';
import type { Agent } from '../agent.js';

export class TelegramChannel implements Channel {
    public name = 'telegram';
    private bot: Bot;
    private router: MessageRouter;
    private agent: Agent;

    constructor(bot: Bot, router: MessageRouter, agent: Agent) {
        this.bot = bot;
        this.router = router;
        this.agent = agent;
    }

    async init() {
        console.log('✅ Telegram Channel initialized (via existing bot instance)');
    }

    async sendMessage(to: string, text: string) {
        await this.bot.api.sendMessage(to, text);
    }

    // This class primarily acts as a bridge for the existing bot.ts logic
    // But for a full router, we should eventually move the bot.on logic here.
}
