import type { Agent } from "../agent.js";

export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    prompt: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: string;
    dependencies: string[];
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    status: "pending" | "running" | "completed" | "failed";
    results: Map<string, string>;
    createdAt: Date;
    completedAt?: Date;
}

export class MeshWorkflow {
    private workflows: Map<string, Workflow> = new Map();
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    createWorkflow(id: string, name: string, description: string, steps: Omit<WorkflowStep, "id" | "status" | "result">[]): Workflow {
        const workflow: Workflow = {
            id,
            name,
            description,
            steps: steps.map((s, i) => ({
                ...s,
                id: `${id}_step_${i}`,
                status: "pending",
            })),
            status: "pending",
            results: new Map(),
            createdAt: new Date(),
        };

        this.workflows.set(id, workflow);
        console.log(`🔀 Created workflow ${name} with ${steps.length} steps`);

        return workflow;
    }

    async runWorkflow(workflowId: string, initialInput?: string): Promise<Workflow> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        workflow.status = "running";
        let previousResult = initialInput;

        for (const step of workflow.steps) {
            const canRun = this.canRunStep(step, workflow);
            
            if (!canRun) {
                console.log(`⏳ Step ${step.name} waiting for dependencies`);
                continue;
            }

            console.log(`▶️  Running step: ${step.name}`);
            step.status = "running";

            try {
                let prompt = step.prompt;
                
                if (previousResult && step.prompt.includes("{previous_result}")) {
                    prompt = step.prompt.replace("{previous_result}", previousResult);
                }

                const context = this.buildContext(workflow, step);
                if (context) {
                    prompt = `Context from previous steps:\n${context}\n\nTask:\n${prompt}`;
                }

                const response = await this.agent.run(prompt, `workflow_${workflowId}_${step.id}`, false);
                
                step.status = "completed";
                step.result = response.text;
                workflow.results.set(step.id, response.text);
                previousResult = response.text;

                console.log(`✅ Step ${step.name} completed: ${response.text.slice(0, 50)}...`);
            } catch (err) {
                step.status = "failed";
                step.result = String(err);
                workflow.status = "failed";
                
                console.error(`❌ Step ${step.name} failed:`, err);
                break;
            }
        }

        workflow.status = "completed";
        workflow.completedAt = new Date();

        return workflow;
    }

    private canRunStep(step: WorkflowStep, workflow: Workflow): boolean {
        if (step.dependencies.length === 0) return true;

        for (const depId of step.dependencies) {
            const depStep = workflow.steps.find(s => s.id === depId);
            if (!depStep || depStep.status !== "completed") {
                return false;
            }
        }

        return true;
    }

    private buildContext(workflow: Workflow, currentStep: WorkflowStep): string {
        const contextParts: string[] = [];

        for (const step of workflow.steps) {
            if (step.id === currentStep.id) break;
            if (step.status === "completed" && step.result) {
                contextParts.push(`${step.name}: ${step.result}`);
            }
        }

        return contextParts.join("\n\n");
    }

    async runMeshGoal(goal: string): Promise<string> {
        const decompositionPrompt = `
Break down this goal into specific, ordered steps. For each step, provide:
1. Step name
2. Description  
3. The exact prompt to execute

Format as JSON array:
[{"name": "step 1", "description": "...", "prompt": "..."}]

Goal: ${goal}
`;

        const response = await this.agent.run(decompositionPrompt, "mesh_planner", false);
        
        let steps;
        try {
            const jsonMatch = response.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                steps = JSON.parse(jsonMatch[0]);
            } else {
                steps = [
                    { name: "Analyze", description: "Analyze the goal", prompt: goal },
                ];
            }
        } catch {
            steps = [
                { name: "Execute", description: "Execute the goal", prompt: goal },
            ];
        }

        const workflowId = `mesh_${Date.now()}`;
        const workflow = this.createWorkflow(
            workflowId,
            "Mesh Workflow",
            goal,
            steps
        );

        const result = await this.runWorkflow(workflowId);
        
        return result.results.size > 0 
            ? Array.from(result.results.values()).join("\n\n---\n\n")
            : "Workflow completed with no results";
    }

    getWorkflow(workflowId: string): Workflow | undefined {
        return this.workflows.get(workflowId);
    }

    listWorkflows(): Workflow[] {
        return Array.from(this.workflows.values());
    }

    deleteWorkflow(workflowId: string): boolean {
        return this.workflows.delete(workflowId);
    }

    getWorkflowStatus(workflowId: string): any {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) return null;

        return {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            steps: workflow.steps.map(s => ({
                id: s.id,
                name: s.name,
                status: s.status,
                result: s.result?.slice(0, 100),
            })),
            createdAt: workflow.createdAt,
            completedAt: workflow.completedAt,
        };
    }
}

export const meshToolsDef = {
    type: "function" as const,
    function: {
        name: "mesh",
        description: "Run mesh workflows. Decompose complex goals into steps, run them in order with dependencies.",
        parameters: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["create", "run", "status", "list", "delete"],
                    description: "The mesh operation"
                },
                goal: {
                    type: "string",
                    description: "Goal or task to decompose and run"
                },
                workflowId: {
                    type: "string",
                    description: "Workflow ID"
                }
            },
            required: ["operation"]
        }
    }
};
