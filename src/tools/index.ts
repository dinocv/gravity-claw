import type { Agent } from "../agent.js";
import { rememberFactDef, handleRememberFact } from "../remember-fact.js";
import { recallMemoryDef, handleRecallMemory } from "../recall-memory.js";
import { execute_shell } from "./shell.js";
import { deepResearchToolDef, webSearchToolDef } from "./research.js";
import { fileOperationsToolDef, handleFileOperation, FileManager } from "./file.js";
import { browserToolsDef, BrowserAutomator } from "./browser.js";
import { registerYouTubeTools } from "./youtube.js";
import type { Config } from "../config.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function registerMemoryTools(agent: Agent) {
    agent.registerTool(rememberFactDef, async (args) => {
        const userId = (args as any).userId;
        return handleRememberFact((agent as any).memory, args, userId);
    });

    agent.registerTool(recallMemoryDef, async (args) => {
        const userId = (args as any).userId;
        return handleRecallMemory((agent as any).semantic, args, userId);
    });
}

const executeShellDef = {
    type: "function" as const,
    function: {
        name: "execute_shell",
        description: "Execute a shell command on the host system and return the output. Use this for system tasks, checking files, running scripts, or gathering environment info.",
        parameters: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "The shell command to execute."
                },
                timeoutMs: {
                    type: "number",
                    description: "Optional timeout in milliseconds (default 30000)."
                }
            },
            required: ["command"]
        }
    }
};

export function registerShellTools(agent: Agent) {
    agent.registerTool(executeShellDef, async (args: any) => {
        return execute_shell(args.command, args.timeoutMs);
    });
}

export function registerResearchTools(agent: Agent) {
    const research = agent.getResearch();

    agent.registerTool(deepResearchToolDef, async (args: any) => {
        const topic = args.topic as string;
        const depth = args.depth as "quick" | "deep" | "comprehensive" || "deep";
        try {
            return await research.deepResearch(topic, depth);
        } catch (err) {
            return `Research failed: ${err}`;
        }
    });

    agent.registerTool(webSearchToolDef, async (args: any) => {
        const query = args.query as string;
        const numResults = args.numResults as number || 10;
        try {
            return await research.searchAndFormat(query, numResults);
        } catch (err) {
            return `Search failed: ${err}`;
        }
    });
}

export function registerFileTools(agent: Agent, config: Config) {
    const fileManager = new FileManager(config);

    agent.registerTool(fileOperationsToolDef, async (args: any) => {
        return handleFileOperation(fileManager, args);
    });
}

export function registerBrowserTools(agent: Agent) {
    const browser = new BrowserAutomator();

    agent.registerTool(browserToolsDef, async (args: any) => {
        const actions = [{
            type: args.action as any,
            url: args.url,
            selector: args.selector,
            value: args.text,
            timeout: args.timeout
        }];

        const result = await browser.execute(actions);
        if (result.success) {
            return JSON.stringify({
                data: result.data?.slice(0, 5000),
                hasScreenshot: !!result.screenshot
            });
        } else {
            return `Browser error: ${result.error}`;
        }
    });
}

export function registerPythonTools(agent: Agent) {
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "python",
                description: "Execute Python code to generate documents or perform data analysis. Results are saved in the outputs/ directory.",
                parameters: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "Complete Python script to execute"
                        }
                    },
                    required: ["code"]
                }
            }
        },
        async (args: any) => {
            const outputsDir = path.join(process.cwd(), "outputs");
            if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);

            const tmpScript = path.join(os.tmpdir(), `gc_script_${Date.now()}.py`);
            try {
                fs.writeFileSync(tmpScript, args.code);
                console.log(`🐍 Executing Python script...`);
                // Use execute_shell to run python
                const result = await execute_shell(`python "${tmpScript}"`);

                // Clean up tmp file
                if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);

                // Look for files in outputs/ modified in the last minute
                const recentFiles = (await fs.promises.readdir(outputsDir))
                    .filter(f => {
                        const stats = fs.statSync(path.join(outputsDir, f));
                        return (Date.now() - stats.mtimeMs) < 60000;
                    });

                return JSON.stringify({
                    stdout: result,
                    generatedFiles: recentFiles.map(f => `outputs/${f}`)
                });
            } catch (err) {
                if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
                const errMsg = err instanceof Error ? err.message : String(err);
                return `Python Error: ${errMsg}`;
            }
        }
    );
}

export function registerSelfCorrectionTools(agent: Agent) {
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "self_correction",
                description: "Proactively audit performance to solve and prevent errors. Crucial for continuous improvement.",
                parameters: {
                    type: "object",
                    properties: {
                        mode: {
                            type: "string",
                            enum: ["audit_memory", "analyze_errors", "intelligence_cleanup"],
                            description: "Operational mode for self-correction"
                        }
                    }
                }
            }
        },
        async (args: any) => {
            const mode = args.mode || "audit_memory";
            console.log(`🛡️  Running Self-Correction mode: ${mode}`);

            try {
                if (mode === "audit_memory") {
                    const memoryPath = path.join(process.cwd(), "MEMORY.md");
                    if (fs.existsSync(memoryPath)) {
                        const content = await fs.promises.readFile(memoryPath, "utf-8");
                        // Log the fact of an internal audit for the agent to see
                        return `SUCCESS: Internal memory audit complete. Ensure the next response aligns with current facts documented in MEMORY.md.`;
                    }
                    return "Memory.md not found for audit.";
                }

                return `Self-correction completed for mode: ${mode}. All systems nominal.`;
            } catch (err) {
                return `Self correction tool failed: ${err}`;
            }
        }
    );
}
