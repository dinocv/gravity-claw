import type { ToolDef } from "./llm.js";
import type { SemanticMemory } from "./semantic.js";

export const recallMemoryDef: ToolDef = {
    type: "function",
    function: {
        name: "recall_memory",
        description: "Search the deep archives of past conversations for specific details.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query." }
            },
            required: ["query"]
        }
    }
};

export async function handleRecallMemory(semantic: SemanticMemory, args: any, userId: string): Promise<string> {
    const results = await semantic.search(userId, args.query, 5);
    if (results.length === 0) return "No relevant historical details found.";
    return `HISTORICAL RECALLED CONTEXT:\n${results.join("\n")}`;
}
