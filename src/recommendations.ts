import type { Agent } from './agent.js';
import type { Config } from './config.js';

/**
 * Smart Recommendations Engine:
 * Tracks usage patterns and proactively surfaces insights.
 */
export class RecommendationsEngine {
    private agent: Agent;
    private config: Config;
    private eventLog: Array<{ ts: number; event: string; }> = [];

    constructor(agent: Agent, config: Config) {
        this.agent = agent;
        this.config = config;
    }

    /** Record an interaction event */
    track(event: string) {
        this.eventLog.push({ ts: Date.now(), event });
        // Keep only last 200 events
        if (this.eventLog.length > 200) this.eventLog.shift();
    }

    /** Generate a proactive recommendation based on patterns */
    async recommend(): Promise<string | null> {
        if (this.eventLog.length < 10) return null;

        const recent = this.eventLog.slice(-50);
        const summary = recent.map(e => e.event).join('\n');

        try {
            const prompt = `Based on these recent user interactions:\n${summary}\n\nAs a smart advisor, suggest ONE proactive recommendation the user would find genuinely useful. Be brief and specific.`;
            const result = await this.agent.run(prompt, 'recommendations_engine');
            return result.text;
        } catch (err) {
            return null;
        }
    }
}
