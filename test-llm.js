import { LLM } from "./src/llm.ts";
import { loadConfig } from "./src/config.ts";

async function run() {
    const config = loadConfig();
    // Temporarily disable groq to test openrouter
    config.groq.apiKey = "";
    const llm = new LLM(config);

    // Mock tools implementation
    const tools = {
        get_time: (args) => {
            console.log(`[Tool Called] get_time for city: ${args.city}`);
            return `The current time in ${args.city} is ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`;
        }
    };

    const messages = [{ role: "user", content: "What time is it in Paris?" }];
    const toolDefs = [{
        type: "function",
        function: {
            name: "get_time",
            description: "A tool to get the current time in a city",
            parameters: {
                type: "object",
                properties: { city: { type: "string" } },
                required: ["city"]
            }
        }
    }];

    try {
        console.log("Starting chat with tools...");
        const res = await llm.chat({
            systemPrompt: "You are a helpful assistant.",
            messages,
            tools: toolDefs
        });

        const { message } = res;

        // Handle tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
            messages.push(message);

            for (const toolCall of message.tool_calls) {
                const name = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                const result = tools[name](args);

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: result
                });
            }

            console.log("Following up with tool results...");
            const finalRes = await llm.chat({
                systemPrompt: "You are a helpful assistant.",
                messages,
                tools: toolDefs
            });
            console.log("Final Response:", finalRes.message.content);
        } else {
            console.log("Response:", message.content);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
