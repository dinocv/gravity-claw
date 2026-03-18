import type { ToolDef } from "./llm.js";
import type { MemoryManager } from "./memory.js";

export const rememberFactDef: ToolDef = {
    type: "function",
    function: {
        name: "remember_fact",
        description: "Save a core fact about the user or a topic that should be remembered forever (preferences, bio, etc).",
        parameters: {
            type: "object",
            properties: {
                fact: { type: "string", description: "The concise fact to remember." },
                category: { type: "string", description: "Optional category (e.g., 'preference', 'bio')." }
            },
            required: ["fact"]
        }
    }
};

export async function handleRememberFact(memory: MemoryManager, args: any, userId: string): Promise<string> {
    await memory.rememberFact(userId, args.fact, args.category);
    return `Success: Fact remembered for user ${userId}.`;
}
