import type { Agent } from './agent.js';

export interface SubAgentRole {
    name: string;
    description: string;
    systemPrompt: string;
}

const ROLES: SubAgentRole[] = [
    {
        name: 'researcher',
        description: 'Finds information, reads web pages, and synthesizes research',
        systemPrompt: 'You are a specialized Research Sub-Agent. Your ONLY job is to research topics thoroughly using web_search and deep_research tools. Return a structured research report with sources.'
    },
    {
        name: 'coder',
        description: 'Writes, edits, and debugs code files',
        systemPrompt: 'You are a specialized Coding Sub-Agent. Your ONLY job is to write clean, working code. Use file_operations and execute_shell tools to read context and write files.'
    },
    {
        name: 'reviewer',
        description: 'Reviews plans, code, or text for quality and correctness',
        systemPrompt: 'You are a specialized Review Sub-Agent. Critically evaluate the content provided to you. Point out bugs, gaps in logic, and risks. Be direct and precise.'
    },
    {
        name: 'planner',
        description: 'Decomposes goals into steps and coordinates sub-agents',
        systemPrompt: 'You are a specialized Planning Sub-Agent. Break down complex goals into clear sequential steps. Output a numbered plan with which agent should handle each step.'
    }
];

export class SwarmManager {
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    /** Run a named sub-agent with a special system prompt injected */
    async runSubAgent(role: string, task: string, userId: string): Promise<string> {
        const roleConfig = ROLES.find(r => r.name === role);
        if (!roleConfig) {
            return `Error: Unknown swarm role '${role}'. Available: ${ROLES.map(r => r.name).join(', ')}`;
        }

        console.log(`🐝 [Swarm] Running ${role} sub-agent for task: ${task.slice(0, 60)}`);

        // Temporarily set system prompt override
        const fullPrompt = `${roleConfig.systemPrompt}\n\n--- TASK ---\n${task}`;
        const result = await this.agent.run(fullPrompt, userId);
        return result.text;
    }

    /** Run a full mesh workflow: decompose → execute with agents → review */
    async runMeshWorkflow(goal: string, userId: string): Promise<string> {
        console.log(`🌐 [Swarm] Starting Mesh Workflow for: ${goal.slice(0, 60)}`);

        // Step 1: Plan
        const plan = await this.runSubAgent('planner', `Decompose this goal into 3-5 specific sub-tasks: "${goal}"`, userId);
        console.log(`📋 [Swarm] Plan generated.`);

        // Step 2: Research if needed
        const researchTask = `Based on this plan:\n${plan}\n\nConduct the research necessary to execute the plan.`;
        const research = await this.runSubAgent('researcher', researchTask, userId);
        console.log(`🔍 [Swarm] Research complete.`);

        // Step 3: Execute/implement
        const executeTask = `Based on this plan:\n${plan}\n\nAnd this research:\n${research.slice(0, 3000)}\n\nNow execute the tasks. Write code or files as needed.`;
        const execution = await this.runSubAgent('coder', executeTask, userId);

        // Step 4: Review
        const reviewTask = `Review this work for quality:\n${execution.slice(0, 3000)}`;
        const review = await this.runSubAgent('reviewer', reviewTask, userId);

        return `🌐 **Mesh Workflow Complete**\n\n**Plan:**\n${plan}\n\n**Research:**\n${research.slice(0, 500)}...\n\n**Execution Summary:**\n${execution.slice(0, 500)}...\n\n**Review:**\n${review}`;
    }

    getAvailableRoles(): string {
        return ROLES.map(r => `• **${r.name}**: ${r.description}`).join('\n');
    }
}
