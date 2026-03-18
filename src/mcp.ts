import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Agent } from "./agent.js";

interface MCPServerConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    serverUrl?: string;
    headers?: Record<string, string>;
}

interface MCPConfig {
    mcpServers: Record<string, MCPServerConfig>;
}

export class MCPManager {
    private servers: Map<string, Client> = new Map();
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    async init() {
        const configPath = path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json");

        if (!fs.existsSync(configPath)) {
            console.log("⚠️ MCP config not found at:", configPath);
            return;
        }

        try {
            const config: MCPConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            console.log(`🔌 Found ${Object.keys(config.mcpServers).length} MCP servers.`);

            const connections = Object.entries(config.mcpServers).map(([name, serverConfig]) =>
                this.connectServerWithTimeout(name, serverConfig, 15000) // 15s timeout
            );

            await Promise.allSettled(connections);
        } catch (err) {
            console.error("❌ Failed to load MCP config:", err);
        }
    }

    private async connectServerWithTimeout(name: string, config: MCPServerConfig, timeoutMs: number) {
        return Promise.race([
            this.connectServer(name, config),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Connection to ${name} timed out`)), timeoutMs))
        ]).catch(err => {
            console.error(`❌ MCP Server ${name} error:`, err.message);
        });
    }

    private async connectServer(name: string, config: MCPServerConfig) {
        let transport;

        if (config.command) {
            console.log(`🔌 [MCP] Launching stdio server for ${name}: ${config.command} ${config.args?.join(" ")}`);
            const cleanEnv: Record<string, string> = {};
            for (const [key, value] of Object.entries(process.env)) {
                if (value !== undefined) cleanEnv[key] = value;
            }
            if (config.env) {
                Object.assign(cleanEnv, config.env);
            }

            transport = new StdioClientTransport({
                command: config.command,
                args: config.args || [],
                env: cleanEnv
            });
        } else if (config.serverUrl) {
            console.log(`🔌 [MCP] Initializing SSE transport for ${name}...`);
            transport = new SSEClientTransport(new URL(config.serverUrl), {
                eventSourceInit: {
                    headers: config.headers
                } as any
            });
        } else {
            console.warn(`⚠️ Invalid config for MCP server: ${name}`);
            return;
        }

        const client = new Client({
            name: "gravity-claw-client",
            version: "0.1.0"
        }, {
            capabilities: {}
        });

        await client.connect(transport);
        this.servers.set(name, client);

        const toolsResponse = await client.listTools();
        console.log(`📦 Registered ${toolsResponse.tools.length} tools from ${name}`);

        for (const tool of toolsResponse.tools) {
            this.registerMCPTool(name, tool);
        }
    }

    private registerMCPTool(serverName: string, tool: any) {
        this.agent.registerTool(
            {
                type: "function",
                function: {
                    name: `mcp_${serverName}_${tool.name}`.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
                    description: `[MCP: ${serverName}] ${tool.description || ""}`,
                    parameters: tool.inputSchema
                }
            },
            async (args) => {
                try {
                    console.log(`⚙️  Running MCP tool: ${serverName}.${tool.name}`);
                    const client = this.servers.get(serverName);
                    if (!client) throw new Error(`MCP Server ${serverName} not connected`);

                    const result = await client.callTool({
                        name: tool.name,
                        arguments: args
                    });

                    return JSON.stringify(result.content);
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    return `Error running MCP tool ${tool.name}: ${errMsg}`;
                }
            }
        );
    }
}
