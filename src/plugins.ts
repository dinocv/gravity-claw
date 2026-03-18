import type { Agent } from './agent.js';

/**
 * Plugin System Interface (Trait-based)
 * Plugins can implement any subset of these interfaces.
 */
export interface PluginProvider {
    type: 'provider';
    name: string;
    complete(prompt: string): Promise<string>;
}

export interface PluginTool {
    type: 'tool';
    name: string;
    description: string;
    execute(args: Record<string, unknown>): Promise<string>;
}

export interface PluginMemory {
    type: 'memory';
    name: string;
    store(key: string, value: string): Promise<void>;
    retrieve(query: string): Promise<string[]>;
}

export type Plugin = PluginProvider | PluginTool | PluginMemory;

export class PluginRegistry {
    private plugins: Plugin[] = [];
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    register(plugin: Plugin) {
        this.plugins.push(plugin);

        // Auto-wire tool plugins into the agent
        if (plugin.type === 'tool') {
            this.agent.registerTool(
                {
                    type: 'function',
                    function: {
                        name: `plugin_${plugin.name}`,
                        description: plugin.description,
                        parameters: { type: 'object', properties: { args: { type: 'object' } } }
                    }
                },
                (input) => (plugin as PluginTool).execute(input)
            );
            console.log(`🔌 Plugin tool registered: plugin_${plugin.name}`);
        }
    }

    getPluginsByType<T extends Plugin>(type: T['type']): T[] {
        return this.plugins.filter(p => p.type === type) as T[];
    }

    listPlugins(): string {
        if (this.plugins.length === 0) return 'No plugins registered.';
        return this.plugins.map(p => `• ${p.name} (${p.type})`).join('\n');
    }
}
