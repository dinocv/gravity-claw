import type { Agent } from "../agent.js";
import type { Config } from "../config.js";

export interface SubAgent {
    id: string;
    name: string;
    role: string;
    agent: Agent;
    status: "idle" | "working" | "completed" | "failed";
    result?: string;
}

export interface SwarmTask {
    id: string;
    description: string;
    assignedTo?: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    result?: string;
    dependencies: string[];
}

export interface SwarmResult {
    swarmId: string;
    task: string;
    subAgents: SubAgent[];
    results: Map<string, string>;
    finalResult: string;
    duration: number;
}

export class AgentSwarm {
    private config: Config;
    private agentFactory: (role: string) => Agent;
    private swarms: Map<string, SubAgent[]> = new Map();
    private tasks: Map<string, SwarmTask[]> = new Map();

    constructor(config: Config, agentFactory: (role: string) => Agent) {
        this.config = config;
        this.agentFactory = agentFactory;
    }

    async createSwarm(
        swarmId: string,
        roles: { name: string; role: string }[]
    ): Promise<SubAgent[]> {
        const subAgents: SubAgent[] = [];

        for (const { name, role } of roles) {
            const agent = this.agentFactory(role);
            
            subAgents.push({
                id: `${swarmId}_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                role,
                agent,
                status: "idle",
            });
        }

        this.swarms.set(swarmId, subAgents);
        console.log(`🐝 Created swarm ${swarmId} with ${subAgents.length} agents`);

        return subAgents;
    }

    async runSwarmTask(
        swarmId: string,
        task: string,
        maxIterations: number = 5
    ): Promise<SwarmResult> {
        const subAgents = this.swarms.get(swarmId);
        if (!subAgents) {
            throw new Error(`Swarm not found: ${swarmId}`);
        }

        const startTime = Date.now();
        const results = new Map<string, string>();

        for (const subAgent of subAgents) {
            subAgent.status = "working";
            
            try {
                const prompt = `You are ${subAgent.role}. ${task}`;
                const response = await subAgent.agent.run(prompt, subAgent.id, false);
                
                subAgent.status = "completed";
                subAgent.result = response.text;
                results.set(subAgent.name, response.text);
                
                console.log(`🐝 ${subAgent.name} completed: ${response.text.slice(0, 50)}...`);
            } catch (err) {
                subAgent.status = "failed";
                subAgent.result = String(err);
                results.set(subAgent.name, `Error: ${err}`);
                console.error(`❌ ${subAgent.name} failed:`, err);
            }
        }

        const synthesisAgent = this.agentFactory("coordinator");
        const synthesisPrompt = `
You are a swarm coordinator. The following subtasks were completed:

${Array.from(results.entries())
    .map(([name, result]) => `${name}: ${result}`)
    .join("\n\n")}

Synthesize these results into a final answer for the original task: ${task}
`;
        
        const finalResponse = await synthesisAgent.run(synthesisPrompt, `${swarmId}_synthesis`, false);
        
        const duration = Date.now() - startTime;

        return {
            swarmId,
            task,
            subAgents,
            results,
            finalResult: finalResponse.text,
            duration,
        };
    }

    async runParallelSwarm(
        swarmId: string,
        tasks: { description: string; role?: string }[]
    ): Promise<SwarmResult[]> {
        const subAgents = this.swarms.get(swarmId);
        if (!subAgents) {
            throw new Error(`Swarm not found: ${swarmId}`);
        }

        const results: SwarmResult[] = [];

        const taskPromises = tasks.map(async (taskDesc, index) => {
            const agentIndex = index % subAgents.length;
            const subAgent = subAgents[agentIndex];
            
            subAgent.status = "working";
            
            try {
                const response = await subAgent.agent.run(taskDesc.description, subAgent.id, false);
                subAgent.status = "completed";
                
                return {
                    swarmId,
                    task: taskDesc.description,
                    subAgents: [subAgent],
                    results: new Map([[subAgent.name, response.text]]),
                    finalResult: response.text,
                    duration: 0,
                };
            } catch (err) {
                subAgent.status = "failed";
                
                return {
                    swarmId,
                    task: taskDesc.description,
                    subAgents: [subAgent],
                    results: new Map([[subAgent.name, String(err)]]),
                    finalResult: `Error: ${err}`,
                    duration: 0,
                };
            }
        });

        return Promise.all(taskPromises);
    }

    getSwarm(swarmId: string): SubAgent[] | undefined {
        return this.swarms.get(swarmId);
    }

    listSwarms(): string[] {
        return Array.from(this.swarms.keys());
    }

    async destroySwarm(swarmId: string): Promise<void> {
        this.swarms.delete(swarmId);
        this.tasks.delete(swarmId);
        console.log(`🐝 Destroyed swarm ${swarmId}`);
    }

    getSwarmStatus(swarmId: string): any {
        const subAgents = this.swarms.get(swarmId);
        if (!subAgents) return null;

        return {
            swarmId,
            subAgents: subAgents.map(agent => ({
                id: agent.id,
                name: agent.name,
                role: agent.role,
                status: agent.status,
                result: agent.result?.slice(0, 100),
            })),
        };
    }
}

export const swarmToolsDef = {
    type: "function" as const,
    function: {
        name: "swarm",
        description: "Manage agent swarms. Create swarms of specialized agents to work on complex tasks in parallel.",
        parameters: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["create", "run", "status", "destroy", "list"],
                    description: "The swarm operation"
                },
                swarmId: {
                    type: "string",
                    description: "Swarm ID"
                },
                roles: {
                    type: "string",
                    description: "Comma-separated roles (for create): researcher,coder,reviewer"
                },
                task: {
                    type: "string",
                    description: "Task description (for run)"
                }
            },
            required: ["operation"]
        }
    }
};
