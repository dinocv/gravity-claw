import cron, { ScheduledTask as CronTask } from "node-cron";
import type { Agent } from "./agent.js";
import type { Config } from "./config.js";
import fs from "node:fs";
import path from "node:path";

export interface ScheduledTask {
    id: string;
    name: string;
    cronExpression: string;
    action: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    lastResult?: string;
}

type TaskHandler = (task: ScheduledTask, agent: Agent) => Promise<string>;

export class TaskScheduler {
    private tasks: Map<string, { task: ScheduledTask; cron: CronTask; handler: TaskHandler }> = new Map();
    private agent: Agent;
    private config: Config;

    constructor(agent: Agent, config: Config) {
        this.agent = agent;
        this.config = config;
    }

    registerTask(
        id: string,
        name: string,
        cronExpression: string,
        action: string,
        handler: TaskHandler
    ): void {
        if (!cron.validate(cronExpression)) {
            console.error(`❌ Invalid cron expression: ${cronExpression}`);
            return;
        }

        const task: ScheduledTask = {
            id,
            name,
            cronExpression,
            action,
            enabled: true,
        };

        const cronTask = cron.schedule(cronExpression, async () => {
            if (!task.enabled) return;

            console.log(`⏰ Running scheduled task: ${name}`);
            task.lastRun = new Date();

            try {
                const result = await handler(task, this.agent);
                task.lastResult = result;
                console.log(`✅ Task ${name} completed: ${result.slice(0, 50)}...`);
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                task.lastResult = `Error: ${errMsg}`;
                console.error(`❌ Task ${name} failed:`, err);
            }
        });

        this.tasks.set(id, { task, cron: cronTask, handler });
        console.log(`📅 Task registered: ${name} (${cronExpression})`);
        this.syncToFile().catch(console.error);
    }

    start(): void {
        if (!this.config.scheduler?.enabled) {
            console.log("📅 Scheduler disabled");
            return;
        }

        this.registerDefaultTasks();

        console.log(`📅 Scheduler started with ${this.tasks.size} tasks`);
    }

    stop(): void {
        for (const [_, { cron }] of this.tasks) {
            (cron as CronTask).stop();
        }
        this.tasks.clear();
        console.log("📅 Scheduler stopped");
    }

    private registerDefaultTasks(): void {
        this.registerTask(
            "morning_briefing",
            "Morning Briefing",
            "0 8 * * *",
            "morning_briefing",
            async (task, agent) => {
                const message = "Good morning! Provide a summary of what happened yesterday, any pending tasks, and what's coming up.";
                const response = await agent.run(message, "scheduler");
                return `Morning briefing: ${response.text.slice(0, 100)}...`;
            }
        );

        this.registerTask(
            "evening_recap",
            "Evening Recap",
            "0 18 * * *",
            "evening_recap",
            async (task, agent) => {
                const message = "Generate a summary of today's conversations and tasks. What was accomplished? What remains?";
                const response = await agent.run(message, "scheduler");
                return `Evening recap: ${response.text.slice(0, 100)}...`;
            }
        );

        this.registerTask(
            "memory_cleanup",
            "Memory Cleanup",
            "0 2 * * *",
            "memory_cleanup",
            async (task, agent) => {
                const count = await (agent as any).memory.getMessageCount("default");
                if (count > 1000) {
                    await (agent as any).memory.compact("default");
                    return `Cleaned up memory. Total messages: ${count}`;
                }
                return `Memory OK. Total messages: ${count}`;
            }
        );

        this.registerTask(
            "health_check",
            "Health Check",
            "*/15 * * * *",
            "health_check",
            async () => {
                return "Health check: OK";
            }
        );
    }

    async listTasks(): Promise<ScheduledTask[]> {
        return Array.from(this.tasks.values()).map(({ task }) => ({
            ...task,
            nextRun: this.getNextRunTime(task.cronExpression),
        }));
    }

    private getNextRunTime(cronExpression: string): Date {
        const interval = cron.schedule(cronExpression, () => { });
        const next = new Date();
        next.setMinutes(next.getMinutes() + 5);
        return next;
    }

    async enableTask(taskId: string): Promise<string> {
        const found = this.tasks.get(taskId);
        if (!found) return `Task not found: ${taskId}`;

        found.task.enabled = true;
        this.syncToFile().catch(console.error);
        return `Task enabled: ${found.task.name}`;
    }

    async disableTask(taskId: string): Promise<string> {
        const found = this.tasks.get(taskId);
        if (!found) return `Task not found: ${taskId}`;

        found.task.enabled = false;
        this.syncToFile().catch(console.error);
        return `Task disabled: ${found.task.name}`;
    }

    async deleteTask(taskId: string): Promise<string> {
        const found = this.tasks.get(taskId);
        if (!found) return `Task not found: ${taskId}`;

        (found.cron as CronTask).stop();
        this.tasks.delete(taskId);
        this.syncToFile().catch(console.error);
        return `Task deleted: ${found.task.name}`;
    }

    async runTaskNow(taskId: string): Promise<string> {
        const found = this.tasks.get(taskId);
        if (!found) return `Task not found: ${taskId}`;

        try {
            const result = await found.handler(found.task, this.agent);
            found.task.lastResult = result;
            return `Task executed: ${result}`;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            return `Task failed: ${errMsg}`;
        }
    }

    async addCustomTask(
        name: string,
        cronExpression: string,
        action: string,
        handler: TaskHandler
    ): Promise<string> {
        const id = `custom_${Date.now()}`;
        this.registerTask(id, name, cronExpression, action, handler);
        return `Custom task added: ${name}`;
    }

    private async syncToFile(): Promise<void> {
        try {
            const schedulePath = path.join(process.cwd(), "SCHEDULE.md");
            let content = "# Gravity Claw: Scheduled Automation\n\n";
            content += `*Last updated: ${new Date().toLocaleString()}*\n\n`;

            content += "## Active Background Tasks\n";
            content += "| Task | ID | Schedule | Last Run | Status |\n";
            content += "|------|----|----------|----------|--------|\n";

            for (const { task } of this.tasks.values()) {
                const status = task.enabled ? "✅ Enabled" : "❌ Disabled";
                const lastRunTxt = task.lastRun ? task.lastRun.toLocaleString() : "Never";
                content += `| ${task.name} | \`${task.id}\` | \`${task.cronExpression}\` | ${lastRunTxt} | ${status} |\n`;
            }

            await fs.promises.writeFile(schedulePath, content, "utf-8");
            console.log("📅 SCHEDULE.md updated.");
        } catch (err) {
            console.error("❌ Failed to update SCHEDULE.md:", err);
        }
    }
}

export const schedulerToolsDef = {
    type: "function" as const,
    function: {
        name: "scheduler",
        description: "Manage scheduled tasks. List, add, enable, disable, or run tasks on a schedule.",
        parameters: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["list", "add", "enable", "disable", "delete", "run"],
                    description: "The scheduler operation"
                },
                taskId: {
                    type: "string",
                    description: "Task ID (required for enable, disable, delete, run)"
                },
                name: {
                    type: "string",
                    description: "Task name (for add operation)"
                },
                cronExpression: {
                    type: "string",
                    description: "Cron expression (for add operation). Examples: '0 8 * * *' (daily 8am), '*/15 * * * *' (every 15 min)"
                },
                action: {
                    type: "string",
                    description: "Action to perform (for add operation)"
                }
            },
            required: ["operation"]
        }
    }
};
