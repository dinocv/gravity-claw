import fs from "node:fs";
import path from "node:path";
import type { Agent } from "./agent.js";

/**
 * The SkillManager implements the "PopeBot" style Skill System.
 * Every skill is a folder containing a SKILL.md (documentation)
 * and is registered as a tool with the agent.
 */
export class SkillManager {
    private agent: Agent;
    private skillsPath: string;

    constructor(agent: Agent) {
        this.agent = agent;
        this.skillsPath = path.join(process.cwd(), "skills");
    }

    /**
     * Scan the /skills directory and register each folder as a tool.
     */
    async discoverAndRegister() {
        if (!fs.existsSync(this.skillsPath)) {
            console.warn("⚠️ Skills directory not found.");
            return;
        }

        const entries = await fs.promises.readdir(this.skillsPath, { withFileTypes: true });
        const skillDirs = entries.filter(e => e.isDirectory());

        console.log(`🧠 Discovering autonomy skills in ${this.skillsPath}...`);

        for (const dir of skillDirs) {
            const skillName = dir.name;
            const skillMdPath = path.join(this.skillsPath, skillName, "SKILL.md");

            if (fs.existsSync(skillMdPath)) {
                this.registerSkill(skillName, skillMdPath);
            }
        }
    }

    private registerSkill(skillName: string, mdPath: string) {
        // Use a generic tool description that points to the documentation
        const description = `[Autonomy Skill: ${skillName}] Decidedly smarter and more capable tool. Call this to use ${skillName} capabilities. Use this if your base tools aren't enough.`;

        this.agent.registerTool(
            {
                type: "function",
                function: {
                    name: `skill_${skillName}`,
                    description: description,
                    parameters: {
                        type: "object",
                        properties: {
                            read_docs: {
                                type: "boolean",
                                description: "Set to true to read the full SKILL.md before execution. Recommended if you are unsure how to use this skill optimally."
                            },
                            payload: {
                                type: "object",
                                description: "Arguments for the skill (varies by skill). See docs for details.",
                                additionalProperties: true
                            }
                        }
                    }
                }
            },
            async (args: any) => {
                if (args.read_docs) {
                    const docs = await fs.promises.readFile(mdPath, "utf-8");
                    return `SUCCESS: Read Skill Documentation for '${skillName}':\n\n${docs}\n\nPlease proceed by calling the skill again with the correct payload if needed, or execute immediate logic if already planned.`;
                }

                // If not reading docs, we delegate to the actual tool handler (already registered under original name)
                const originalToolName = skillName; // Mapping skill folder name to existing tool name
                const handler = (this.agent as any).tools.get(originalToolName);

                if (handler) {
                    console.log(`🚀 Executing skill: ${skillName}...`);
                    // We map 'payload' back to what the original tool expects
                    return handler(args.payload || args);
                } else {
                    return `Error: Skill '${skillName}' is documented but its handler is not registered in the agent's tool set. Check tool registration.`;
                }
            }
        );

        console.log(`📦 Skill registered: ${skillName}`);
    }
}
