import fs from "node:fs";
import path from "node:path";

export interface Skill {
    name: string;
    description: string;
    triggers: string[];
    instructions: string;
    examples?: string[];
    tools?: string[];
    enabled: boolean;
    filePath: string;
}

export class SkillsManager {
    private skills: Map<string, Skill> = new Map();
    private skillsDir: string;
    private onSkillLoaded?: (skill: Skill) => void;

    constructor(skillsDir: string = "./skills") {
        this.skillsDir = skillsDir;
    }

    setOnSkillLoaded(callback: (skill: Skill) => void): void {
        this.onSkillLoaded = callback;
    }

    async loadSkills(): Promise<void> {
        if (!fs.existsSync(this.skillsDir)) {
            console.log(`📁 Skills directory not found: ${this.skillsDir}`);
            fs.mkdirSync(this.skillsDir, { recursive: true });
            await this.createExampleSkills();
            return;
        }

        const files = fs.readdirSync(this.skillsDir).filter(f => f.endsWith(".md"));
        
        for (const file of files) {
            await this.loadSkill(path.join(this.skillsDir, file));
        }

        console.log(`✅ Loaded ${this.skills.size} skills`);
    }

    private async loadSkill(filePath: string): Promise<void> {
        const content = fs.readFileSync(filePath, "utf-8");
        const skill = this.parseSkillMarkdown(content, filePath);
        
        this.skills.set(skill.name.toLowerCase().replace(/\s+/g, "_"), skill);
        
        if (this.onSkillLoaded) {
            this.onSkillLoaded(skill);
        }

        console.log(`📦 Loaded skill: ${skill.name}`);
    }

    private parseSkillMarkdown(content: string, filePath: string): Skill {
        const lines = content.split("\n");
        
        let name = path.basename(filePath, ".md");
        let description = "";
        const triggers: string[] = [];
        let instructions = "";
        const examples: string[] = [];
        let tools: string[] = [];
        let inInstructions = false;
        let inExamples = false;
        let inTools = false;

        for (const line of lines) {
            if (line.startsWith("# ")) {
                name = line.slice(2).trim();
                continue;
            }

            if (line.startsWith("## ")) {
                const section = line.slice(3).toLowerCase();
                inInstructions = section === "instructions";
                inExamples = section === "examples";
                inTools = section === "tools";
                continue;
            }

            if (line.startsWith("Trigger:") || line.startsWith("trigger:")) {
                const trigger = line.replace(/trigger[sy]:?/i, "").trim();
                if (trigger) triggers.push(...trigger.split(",").map(t => t.trim()));
                continue;
            }

            if (line.startsWith("Description:") || line.startsWith("description:")) {
                description = line.replace(/description:?\s*/i, "").trim();
                continue;
            }

            if (inInstructions && line.trim()) {
                instructions += line + "\n";
            }

            if (inExamples && line.trim()) {
                examples.push(line.trim());
            }

            if (inTools && line.trim()) {
                tools.push(line.trim().replace(/^[-*]\s*/, ""));
            }
        }

        return {
            name,
            description,
            triggers,
            instructions: instructions.trim(),
            examples,
            tools,
            enabled: true,
            filePath,
        };
    }

    private async createExampleSkills(): Promise<void> {
        const examples = [
            {
                name: "code_review",
                content: `# Code Review

Description: Analyze code for bugs, security issues, and improvements

Trigger: review code, analyze code, check code

## Instructions
You are an expert code reviewer. Analyze the provided code and identify:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code style improvements
5. Missing error handling

Provide a detailed report with line numbers and specific recommendations.

## Examples
- "Review this function for bugs"
- "Analyze the authentication code"

## Tools
- execute_shell
- file_operations
`
            },
            {
                name: "project_planner",
                content: `# Project Planner

Description: Break down complex projects into actionable tasks

Trigger: plan project, create project, break down

## Instructions
When asked to plan a project:
1. First understand the goal and requirements
2. Break into major phases
3. List specific actionable tasks for each phase
4. Identify dependencies
5. Suggest a reasonable timeline

Format output as a clear, numbered task list.

## Examples
- "Plan a new web app"
- "Break down this feature into tasks"
`
            },
            {
                name: "researcher",
                content: `# Researcher

Description: Deep dive into topics and provide comprehensive information

Trigger: research, investigate, find out about

## Instructions
When asked to research:
1. Use web search to find current information
2. Synthesize findings into a clear summary
3. Include relevant sources
4. Identify gaps or uncertainties

## Tools
- web_search

## Examples
- "Research the best LLM for coding"
- "Find information about TypeScript decorators"
`
            },
        ];

        for (const example of examples) {
            const filePath = path.join(this.skillsDir, `${example.name}.md`);
            fs.writeFileSync(filePath, example.content, "utf-8");
        }

        console.log(`📁 Created ${examples.length} example skills`);
    }

    getSkill(name: string): Skill | undefined {
        return this.skills.get(name.toLowerCase().replace(/\s+/g, "_"));
    }

    getAllSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    getEnabledSkills(): Skill[] {
        return this.getAllSkills().filter(s => s.enabled);
    }

    matchSkills(query: string): Skill[] {
        const queryLower = query.toLowerCase();
        return this.getEnabledSkills().filter(skill => {
            if (skill.triggers.some(t => queryLower.includes(t.toLowerCase()))) {
                return true;
            }
            if (skill.name.toLowerCase().includes(queryLower)) {
                return true;
            }
            return false;
        });
    }

    enableSkill(name: string): boolean {
        const skill = this.getSkill(name);
        if (!skill) return false;
        skill.enabled = true;
        return true;
    }

    disableSkill(name: string): boolean {
        const skill = this.getSkill(name);
        if (!skill) return false;
        skill.enabled = false;
        return true;
    }

    async reloadSkill(name: string): Promise<boolean> {
        const skill = this.getSkill(name);
        if (!skill) return false;
        
        await this.loadSkill(skill.filePath);
        return true;
    }

    getSkillsAsSystemPrompt(): string {
        const skills = this.getEnabledSkills();
        
        if (skills.length === 0) {
            return "";
        }

        const skillDescriptions = skills.map(s => 
            `## ${s.name}\n${s.description}\nTriggers: ${s.triggers.join(", ")}`
        ).join("\n\n");

        return `You have access to the following skills:\n\n${skillDescriptions}\n\nWhen a user asks about something that matches a skill's triggers, use that skill's instructions to help.`;
    }
}
