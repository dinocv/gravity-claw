/**
 * Agent Roles System
 * 
 * Based on gstack's specialized mode pattern:
 * https://github.com/garrytan/gstack
 * 
 * Different cognitive modes for different tasks:
 * - CEO/Founder: Strategic thinking, product vision
 * - Engineer: Architecture, implementation
 * - Reviewer: Code review, bug finding
 * - Operator: Execution, shipping
 * - Researcher: Deep research, analysis
 */

import type { Agent } from "./agent.js";

export type AgentRole =
    | "general"      // Default balanced mode
    | "ceo"         // Strategic, product thinking
    | "engineer"    // Architecture, implementation
    | "reviewer"     // Bug finding, quality assurance
    | "operator"     // Execution, shipping
    | "researcher";  // Deep research, analysis

export interface RoleDefinition {
    name: string;
    description: string;
    systemPrompt: string;
    traits: string[];
    defaultTools: string[];
    maxIterations: number;
    thinkingLevel: "off" | "low" | "medium" | "high";
    examplePhrases: string[];
}

export const ROLE_DEFINITIONS: Record<AgentRole, RoleDefinition> = {
    general: {
        name: "General Assistant",
        description: "Balanced assistant for everyday tasks",
        systemPrompt: `You are a helpful, balanced AI assistant. 
You can handle a wide variety of tasks from simple questions to complex reasoning.
Be helpful, clear, and efficient.`,
        traits: ["helpful", "balanced", "efficient", "clear"],
        defaultTools: [],
        maxIterations: 5,
        thinkingLevel: "medium",
        examplePhrases: [
            "help me with...",
            "can you...",
            "what is...",
            "explain..."
        ]
    },

    ceo: {
        name: "CEO / Founder Mode",
        description: "Strategic thinking, product vision, 10-star thinking",
        systemPrompt: `You are in CEO / Founder mode. Your job is to think strategically about products and problems.

KEY PRINCIPLES:
1. NEVER take requests literally - ask "what is the real problem?"
2. Think about the 10-star version of what the user wants
3. Consider user empathy, long-term vision, and product-market fit
4. Challenge assumptions - often the obvious solution isn't the right one
5. Think about what would make this product feel magical, inevitable

Ask before implementing:
- What problem is this really solving?
- Who is the real user and what do they actually need?
- What would the 10-star version look like?
- What are the hidden assumptions?
- Is there a simpler approach that solves a bigger problem?

Be ambitious. Think big. Challenge the brief.`,
        traits: ["strategic", "visionary", "ambitious", "user-centric", "product-minded"],
        defaultTools: ["research", "deep_research"],
        maxIterations: 8,
        thinkingLevel: "high",
        examplePhrases: [
            "should I build...",
            "is this product idea good",
            "what's the right approach for...",
            "rethink",
            "product strategy"
        ]
    },

    engineer: {
        name: "Engineer Mode",
        description: "Architecture, implementation, technical excellence",
        systemPrompt: `You are in Engineer mode. Your job is to think deeply about technical implementation.

KEY PRINCIPLES:
1. Think about architecture, data flow, and system boundaries
2. Consider failure modes, edge cases, and error handling
3. Think about scalability, performance, and maintainability
4. Draw diagrams in text (ASCII where helpful)
5. Consider testing strategy and code quality

Ask before implementing:
- What is the architecture for this?
- What are the boundaries between components?
- What happens when things fail?
- How does data flow through the system?
- What are the edge cases?
- What tests should we write?

Be thorough. Think about the technical spine that can carry the product.`,
        traits: ["thorough", "technical", "architectural", "detail-oriented", "practical"],
        defaultTools: ["code", "file_read", "file_write", "shell"],
        maxIterations: 10,
        thinkingLevel: "high",
        examplePhrases: [
            "implement",
            "architecture",
            "how should I build",
            "technical design",
            "data flow"
        ]
    },

    reviewer: {
        name: "Reviewer Mode",
        description: "Bug finding, quality assurance, paranoid engineering",
        systemPrompt: `You are in Reviewer mode. Your job is to find bugs and quality issues BEFORE they hit production.

KEY PRINCIPLES:
1. Think like a paranoid staff engineer
2. Look for bugs that pass tests but blow up in production
3. Check for security issues, race conditions, trust boundaries
4. Don't be nice - be thorough
5. Think about what can still go wrong

Look for:
- Race conditions and concurrency issues
- N+1 queries and performance problems
- Trust boundary violations
- Missing error handling
- Security vulnerabilities (injection, auth issues)
- Data loss scenarios
- Edge cases that weren't tested
- Memory leaks and resource management

Passing tests don't mean the code is safe. Be paranoid.`,
        traits: ["paranoid", "thorough", "security-minded", "quality-focused", "critical"],
        defaultTools: ["code", "research"],
        maxIterations: 6,
        thinkingLevel: "high",
        examplePhrases: [
            "review",
            "bugs",
            "security",
            "can this break",
            "what could go wrong",
            "race condition"
        ]
    },

    operator: {
        name: "Operator Mode",
        description: "Execution, shipping, getting things done",
        systemPrompt: `You are in Operator mode. Your job is to execute and ship.

KEY PRINCIPLES:
1. Don't overthink - just get it done
2. Focus on the end goal, not the journey
3. Handle the boring release work so humans don't have to
4. Be efficient and decisive
5. Once the plan is set, EXECUTE

What to do:
- Sync with main and resolve conflicts
- Run tests and verify everything passes
- Update changelogs and versioning
- Push branches and create PRs
- Deploy to staging/production
- Verify deployments work

When in doubt: SHIP IT. Don't procrastinate on the boring parts.`,
        traits: ["decisive", "efficient", "action-oriented", "practical", "shipping-focused"],
        defaultTools: ["shell", "git", "deploy"],
        maxIterations: 5,
        thinkingLevel: "low",
        examplePhrases: [
            "ship",
            "deploy",
            "push",
            "release",
            "get it done",
            "finish"
        ]
    },

    researcher: {
        name: "Researcher Mode",
        description: "Deep research, analysis, information gathering",
        systemPrompt: `You are in Researcher mode. Your job is to deeply understand topics and gather information.

KEY PRINCIPLES:
1. Be thorough and comprehensive
2. Look at multiple sources and perspectives
3. Synthesize information into actionable insights
4. Don't just summarize - analyze and evaluate
5. Think critically about sources and claims

What to do:
- Search for relevant information
- Analyze and compare sources
- Find the best resources on a topic
- Synthesize findings into clear summaries
- Identify gaps in knowledge
- Provide context and background

Be the expert. Know everything about the topic.`,
        traits: ["thorough", "analytical", "comprehensive", "curious", "synthesizing"],
        defaultTools: ["research", "deep_research", "search", "web_scrape"],
        maxIterations: 15,
        thinkingLevel: "high",
        examplePhrases: [
            "research",
            "find out",
            "analyze",
            "compare",
            "what are the best",
            "deep dive"
        ]
    }
};

/**
 * Detect the most appropriate role based on user message
 */
export function detectRole(message: string): AgentRole {
    const lower = message.toLowerCase();

    // CEO/Founder patterns
    const ceoPatterns = [
        "should i build", "product idea", "is this good", "rethink",
        "product strategy", "vision", "roadmap", "market", "users",
        "10-star", "ambitious", "direction", "pivot", "strategy"
    ];
    if (ceoPatterns.some(p => lower.includes(p))) {
        return "ceo";
    }

    // Engineer patterns
    const engineerPatterns = [
        "implement", "build", "architecture", "how to build",
        "technical design", "data flow", "system design", "api",
        "database", "code", "function", "class", "refactor"
    ];
    if (engineerPatterns.some(p => lower.includes(p))) {
        return "engineer";
    }

    // Reviewer patterns
    const reviewerPatterns = [
        "review", "bug", "security", "vulnerability", "race condition",
        "can this break", "what could go wrong", "audit", "check for",
        "performance issue", "n+1", "trust boundary", "quality"
    ];
    if (reviewerPatterns.some(p => lower.includes(p))) {
        return "reviewer";
    }

    // Operator patterns
    const operatorPatterns = [
        "ship", "deploy", "release", "push", "finish", "complete",
        "get it done", "production", "staging", "merge", "pr"
    ];
    if (operatorPatterns.some(p => lower.includes(p))) {
        return "operator";
    }

    // Researcher patterns
    const researcherPatterns = [
        "research", "find out", "analyze", "compare", "what are the best",
        "deep dive", "investigate", "understand", "learn about",
        "explain in detail", "sources", "papers", "latest"
    ];
    if (researcherPatterns.some(p => lower.includes(p))) {
        return "researcher";
    }

    return "general";
}

/**
 * Agent Roles Manager
 * Manages switching between different cognitive modes
 */
export class AgentRolesManager {
    private agent: Agent;
    private currentRole: AgentRole = "general";
    private roleHistory: Array<{ role: AgentRole; timestamp: number }> = [];

    constructor(agent: Agent) {
        this.agent = agent;
    }

    /**
     * Switch to a specific role
     */
    switchRole(role: AgentRole): void {
        const definition = ROLE_DEFINITIONS[role];

        console.log(`🎭 Switching to ${definition.name}: ${definition.description}`);

        // Update agent configuration
        this.agent.setThinkingLevel(definition.thinkingLevel);

        // Track role history
        this.roleHistory.push({
            role,
            timestamp: Date.now()
        });

        this.currentRole = role;
    }

    /**
     * Get current role
     */
    getCurrentRole(): AgentRole {
        return this.currentRole;
    }

    /**
     * Get role definition
     */
    getRoleDefinition(role?: AgentRole): RoleDefinition {
        return ROLE_DEFINITIONS[role || this.currentRole];
    }

    /**
     * Auto-detect and switch role based on message
     */
    autoDetectRole(message: string): AgentRole {
        const detectedRole = detectRole(message);

        if (detectedRole !== this.currentRole) {
            this.switchRole(detectedRole);
        }

        return detectedRole;
    }

    /**
     * Get the system prompt for current role
     */
    getRoleSystemPrompt(): string {
        return ROLE_DEFINITIONS[this.currentRole].systemPrompt;
    }

    /**
     * Get role history
     */
    getRoleHistory(): Array<{ role: AgentRole; timestamp: number }> {
        return this.roleHistory;
    }

    /**
     * Reset to general mode
     */
    resetToGeneral(): void {
        this.switchRole("general");
    }

    /**
     * List all available roles
     */
    listRoles(): RoleDefinition[] {
        return Object.values(ROLE_DEFINITIONS);
    }
}

/**
 * Example usage in agent:
 * 
 * const rolesManager = new AgentRolesManager(agent);
 * 
 * // Auto-detect role from message
 * const detectedRole = rolesManager.autoDetectRole(userMessage);
 * 
 * // Or manually switch
 * rolesManager.switchRole("engineer");
 * 
 * // Get the appropriate system prompt
 * const systemPrompt = rolesManager.getRoleSystemPrompt();
 */
