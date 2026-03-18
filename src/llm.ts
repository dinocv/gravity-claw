import OpenAI from "openai";
import type { Config } from "./config.js";

export type ChatMessage = OpenAI.ChatCompletionMessageParam;
export type ToolCall = OpenAI.ChatCompletionMessageToolCall;
export type ToolDef = OpenAI.ChatCompletionTool;

export interface LLMResponse {
    message: OpenAI.ChatCompletionMessage;
    finishReason: string | null;
}

export interface UsageStats {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    latencyMs: number;
}

export type ProviderType = "openrouter" | "ollama" | "anthropic" | "google" | "deepseek" | "groq" | "huggingchat";

export interface ProviderConfig {
    type: ProviderType;
    apiKey?: string;
    baseURL?: string;
    model: string;
    maxTokens?: number;
    thinking?: boolean;
}

export type TaskType = "simple" | "reasoning" | "coding" | "research" | "critical";

export class LLM {
    private config: Config;
    private currentProviderIndex: number = 0;
    private providers: ProviderConfig[] = [];
    public usage: UsageStats[] = [];

    constructor(config: Config) {
        this.config = config;
        this.initializeProviders();
    }

    /**
     * Auto-select best model based on task type (like Perplexity Computer)
     * Simple: use fast/free models
     * Critical: use best reasoning models
     */
    selectProviderForTask(taskType: TaskType): ProviderConfig {
        switch (taskType) {
            case "simple":
                // Use fastest, cheapest model for simple questions
                const ollama = this.providers.find(p => p.type === "ollama");
                if (ollama) return ollama;
                break;
            case "coding":
                // DeepSeek is great for code
                const deepseek = this.providers.find(p => p.type === "deepseek" || p.model.includes("deepseek"));
                if (deepseek) {
                    this.currentProviderIndex = this.providers.indexOf(deepseek);
                    return deepseek;
                }
                break;
            case "reasoning":
            case "research":
                // Use Gemini for research - good reasoning, free tier
                const gemini = this.providers.find(p => p.model.includes("gemini"));
                if (gemini) {
                    this.currentProviderIndex = this.providers.indexOf(gemini);
                    return gemini;
                }
                break;
            case "critical":
                // Use best model for critical tasks
                const claude = this.providers.find(p => p.type === "anthropic" || p.model.includes("claude"));
                if (claude) {
                    this.currentProviderIndex = this.providers.indexOf(claude);
                    return claude;
                }
                break;
        }
        // Default: use first available
        return this.getCurrentProvider();
    }

    /**
     * Analyze task and auto-select provider
     */
    autoSelectProvider(userMessage: string): ProviderConfig {
        const msg = userMessage.toLowerCase();

        // Coding keywords
        if (msg.includes("code") || msg.includes("program") || msg.includes("function") ||
            msg.includes("bug") || msg.includes("debug") || msg.includes("script")) {
            return this.selectProviderForTask("coding");
        }

        // Research keywords
        if (msg.includes("research") || msg.includes("analyze") || msg.includes("explain") ||
            msg.includes("compare") || msg.includes("find information")) {
            return this.selectProviderForTask("research");
        }

        // Critical reasoning
        if (msg.includes("why") || msg.includes("how does") || msg.includes("reason") ||
            msg.includes("think") || msg.includes("solve")) {
            return this.selectProviderForTask("reasoning");
        }

        // Simple questions - use fastest
        if (msg.split(" ").length < 10) {
            return this.selectProviderForTask("simple");
        }

        // Default
        return this.getCurrentProvider();
    }

    private initializeProviders() {
        this.providers = [];

        // Add Ollama FIRST - free unlimited local LLM
        if (this.config.ollama?.baseURL) {
            this.providers.push({
                type: "ollama",
                baseURL: this.config.ollama.baseURL,
                model: this.config.ollama.model || "llama3.2",
                maxTokens: 4096,
            });
            console.log("✅ Added Ollama provider");
        } else {
            console.log("⚠️ Ollama not configured");
        }

        // Add Ollama Cloud as fallback (when local is off)
        if (this.config.ollamaCloud?.apiKey) {
            this.providers.push({
                type: "ollama",
                baseURL: this.config.ollamaCloud.url || "https://ollama.com/v1",
                model: this.config.ollamaCloud.model || "llama-3.1-8b-instruct",
                maxTokens: 4096,
                apiKey: this.config.ollamaCloud.apiKey,
            });
            console.log("✅ Added Ollama Cloud provider (fallback)");
        }

        // Add Groq as fallback (free tier available)
        if (this.config.groq?.apiKey) {
            this.providers.push({
                type: "groq",
                apiKey: this.config.groq.apiKey,
                baseURL: "https://api.groq.com/openai/v1",
                model: this.config.groq.model || "llama-3.1-70b-versatile",
                maxTokens: 4096,
            });
            console.log("✅ Added Groq provider (free tier)");
        }

        // Add HuggingChat as fallback (free, no API key needed)
        if (this.config.huggingchat) {
            this.providers.push({
                type: "huggingchat",
                baseURL: "https://huggingface.co/chat",
                model: this.config.huggingchat.model || "meta-llama/Llama-3.3-70B-Instruct",
                maxTokens: 4096,
            });
            console.log("✅ Added HuggingChat provider (free, no API key)");
        }

        // Add OpenRouter as fallback (DISABLED - requires credits)
        // if (this.config.openrouter.apiKey) {
        //     this.providers.push({
        //         type: "openrouter",
        //         apiKey: this.config.openrouter.apiKey,
        //         baseURL: "https://openrouter.ai/api/v1",
        //         model: this.config.openrouter.model || "google/gemini-2.0-flash-001",
        //         maxTokens: 2048,
        //         thinking: true
        //     });
        //     console.log("✅ Added OpenRouter provider");
        // }

        // Check for preferred provider order from PREFERRED_PROVIDERS env var
        const preferredOrder = process.env.PREFERRED_PROVIDERS?.split(",").map(p => p.trim().toLowerCase()) || [];

        if (preferredOrder.length > 0) {
            // Use the first available provider from the preferred list
            for (const wanted of preferredOrder) {
                const found = this.providers.find(p => p.type.toLowerCase() === wanted);
                if (found) {
                    this.currentProviderIndex = this.providers.indexOf(found);
                    break;
                }
            }
        } else {
            // Default if no providers
            if (this.providers.length === 0) {
                console.warn("⚠️ No LLM providers configured!");
            }

            // CRITICAL: Use Groq as PRIMARY if available (fastest free tier)
            // Otherwise use HuggingChat, then OpenRouter as last resort
            const groqProvider = this.providers.find(p => p.type === "groq");
            const freeProvider = this.providers.find(p => p.type === "huggingchat");

            if (groqProvider) {
                this.currentProviderIndex = this.providers.indexOf(groqProvider);
            } else if (freeProvider) {
                this.currentProviderIndex = this.providers.indexOf(freeProvider);
            } else if (this.providers.length > 0) {
                // Skip OpenRouter if no credits
                const nonOpenRouter = this.providers.find(p => p.type !== "openrouter");
                if (nonOpenRouter) {
                    this.currentProviderIndex = this.providers.indexOf(nonOpenRouter);
                }
            }
        }

        const provider = this.getCurrentProvider();
        console.log(`📡 Using primary provider: ${provider?.type || 'none'} with model: ${provider?.model || 'none'}`);
    }

    setModel(model: string) {
        for (const provider of this.providers) {
            if (this.getProviderModelName(provider).includes(model.split("/").pop() || model)) {
                this.currentProviderIndex = this.providers.indexOf(provider);
                return;
            }
        }
        if (this.providers.length > 0) {
            this.currentProviderIndex = 0;
        }
    }

    getCurrentProvider(): ProviderConfig {
        return this.providers[this.currentProviderIndex] || this.providers[0];
    }

    private getProviderModelName(provider: ProviderConfig): string {
        if (provider.type === "openrouter") {
            return provider.model.split("/").pop() || provider.model;
        }
        return provider.model;
    }

    getModel(): string {
        return this.getCurrentProvider().model;
    }

    async chat(opts: {
        systemPrompt: string;
        messages: ChatMessage[];
        tools?: ToolDef[];
        maxTokens?: number;
    }): Promise<LLMResponse> {
        const startTime = Date.now();
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < this.providers.length; attempt++) {
            const provider = this.getCurrentProvider();

            try {
                // Ensure system prompt is prepended correctly for all providers
                const systemMessage: ChatMessage = { role: "system", content: opts.systemPrompt };
                const messages = [systemMessage, ...opts.messages];

                const result = await this.executeChat(provider, { ...opts, messages });
                const latencyMs = Date.now() - startTime;

                const stats: UsageStats = {
                    model: provider.model,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    cost: 0,
                    latencyMs,
                };
                stats.cost = this.estimateCost(provider, stats);
                this.usage.push(stats);

                return result;
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                console.error(`❌ Provider ${provider.type} failed: ${lastError.message}`);

                if (this.providers.length > 1) {
                    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
                    console.log(`🔄 Trying next provider: ${this.getCurrentProvider().type}`);
                }
            }
        }

        throw lastError || new Error("All providers failed");
    }

    private async executeChat(provider: ProviderConfig, opts: {
        systemPrompt: string;
        messages: ChatMessage[];
        tools?: ToolDef[];
        maxTokens?: number;
    }): Promise<LLMResponse> {
        const maxTokens = opts.maxTokens || provider.maxTokens || 4096;

        // Always try Ollama first for reliability if current provider is not Ollama
        if (provider.type !== "ollama") {
            const ollamaProvider = this.providers.find(p => p.type === "ollama");
            if (ollamaProvider) {
                try {
                    console.log("🔄 Trying Ollama first...");
                    return await this.chatOllama(ollamaProvider, opts, maxTokens);
                } catch (err) {
                    console.error("❌ Ollama failed, trying other provider:", err);
                }
            }
        }

        switch (provider.type) {
            case "ollama":
                return this.chatOllama(provider, opts, maxTokens);
            case "anthropic":
                return this.chatAnthropic(provider, opts, maxTokens);
            case "google":
                return this.chatGoogle(provider, opts, maxTokens);
            case "huggingchat":
                return this.chatHuggingFace(provider, opts, maxTokens);
            case "deepseek":
            case "groq":
            case "openrouter":
            default:
                return this.chatOpenAICompatible(provider, opts, maxTokens);
        }
    }

    private async chatOllama(provider: ProviderConfig, opts: any, maxTokens: number): Promise<LLMResponse> {
        console.log(`🤖 [Ollama] Calling with model: ${provider.model}, baseURL: ${provider.baseURL}`);

        const TIMEOUT_MS = 60000; // 60 second timeout

        try {
            const client = new OpenAI({
                apiKey: "ollama",
                baseURL: provider.baseURL,
                maxRetries: 0, // We handle retries ourselves
            });

            console.log(`🤖 [Ollama] Sending request with ${opts.messages.length} messages`);

            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Ollama request timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
            });

            const response = await Promise.race([
                client.chat.completions.create({
                    model: provider.model,
                    max_tokens: maxTokens,
                    messages: [
                        { role: "system", content: opts.systemPrompt },
                        ...opts.messages,
                    ],
                    ...(opts.tools?.length ? { tools: opts.tools, tool_choice: "auto" } : {}),
                }),
                timeoutPromise
            ]);

            console.log(`🤖 [Ollama] Response received`);

            const choice = response.choices[0];
            return {
                message: choice.message,
                finishReason: choice.finish_reason,
            };
        } catch (err) {
            console.error(`❌ [Ollama] Error:`, err);
            throw err;
        }
    }

    private async chatAnthropic(provider: ProviderConfig, opts: any, maxTokens: number): Promise<LLMResponse> {
        const client = new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.baseURL,
            defaultHeaders: {
                "anthropic-version": "2023-06-01",
            },
        });

        const response = await client.chat.completions.create({
            model: provider.model,
            max_tokens: maxTokens,
            messages: [
                { role: "system", content: opts.systemPrompt },
                ...opts.messages,
            ],
            ...(opts.tools?.length ? { tools: opts.tools, tool_choice: "auto" } : {}),
        });

        const choice = response.choices[0];
        return {
            message: choice.message,
            finishReason: choice.finish_reason,
        };
    }

    private async chatGoogle(provider: ProviderConfig, opts: any, maxTokens: number): Promise<LLMResponse> {
        const client = new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.baseURL,
        });

        const response = await client.chat.completions.create({
            model: provider.model,
            max_tokens: maxTokens,
            messages: [
                { role: "system", content: opts.systemPrompt },
                ...opts.messages,
            ],
            ...(opts.tools?.length ? { tools: opts.tools, tool_choice: "auto" } : {}),
        });

        const choice = response.choices[0];
        return {
            message: choice.message,
            finishReason: choice.finish_reason,
        };
    }

    private async chatOpenAICompatible(provider: ProviderConfig, opts: any, maxTokens: number): Promise<LLMResponse> {
        const client = new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.baseURL,
            ...(provider.type === "openrouter" ? {
                defaultHeaders: {
                    "HTTP-Referer": "https://github.com/gravity-claw",
                    "X-Title": "Gravity Claw",
                },
            } : {}),
        });

        const useTools = opts.tools && opts.tools.length > 0;
        const thinking = provider.thinking || this.config.agent.thinkingLevel !== "off";

        // Only use include_reasoning for models likely to support it (DeepSeek-R1, o1, etc)
        const isReasoner = provider.model.includes("r1") || provider.model.includes("o1") || provider.model.includes("reasoning");

        const response = await client.chat.completions.create({
            model: provider.model,
            max_tokens: maxTokens,
            messages: opts.messages,
            ...(useTools ? { tools: opts.tools, tool_choice: "auto" } : {}),
            ...(thinking && provider.type === "openrouter" && isReasoner ? {
                include_reasoning: true
            } : {}),
        } as any);

        const choice = response.choices[0];
        return {
            message: choice.message,
            finishReason: choice.finish_reason,
        };
    }

    private async chatHuggingFace(provider: ProviderConfig, opts: any, maxTokens: number): Promise<LLMResponse> {
        // HuggingChat uses the free HF Inference API
        const model = provider.model;
        const token = process.env.HUGGINGFACE_TOKEN;

        try {
            if (token) {
                // Use Inference API with token
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        inputs: opts.systemPrompt + "\n" + opts.messages.map((m: any) => `${m.role}: ${m.content}`).join("\n"),
                        parameters: { max_new_tokens: maxTokens, temperature: 0.7 },
                    }),
                });

                const data = await response.json() as any;
                const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text || "";

                return { message: { role: "assistant", content: text, refusal: null }, finishReason: "stop" };
            } else {
                // Use HuggingChat free API
                const response = await fetch("https://huggingface.co/chat/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "system", content: opts.systemPrompt }, ...opts.messages],
                        max_tokens: maxTokens,
                    }),
                });

                const data = await response.json() as any;
                return {
                    message: { role: "assistant", content: data.generated_text || data.choices?.[0]?.message?.content || "", refusal: null },
                    finishReason: data.choices?.[0]?.finish_reason || "stop"
                };
            }
        } catch (err) {
            console.error("❌ HuggingFace error:", err);
            throw err;
        }
    }

    private estimateCost(provider: ProviderConfig, stats: UsageStats): number {
        const costs: Record<string, { prompt: number; completion: number }> = {
            "claude-3-5-sonnet-20241022": { prompt: 3, completion: 15 },
            "claude-3-opus-20240229": { prompt: 15, completion: 75 },
            "gpt-4o": { prompt: 2.5, completion: 10 },
            "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
            "gemini-2.0-flash-001": { prompt: 0, completion: 0 },
            "llama-3.3-70b-versatile": { prompt: 0.59, completion: 0.79 },
            "deepseek-chat": { prompt: 0.14, completion: 0.28 },
        };

        const modelCosts = costs[provider.model] || { prompt: 0, completion: 0 };
        return (stats.promptTokens / 1_000_000 * modelCosts.prompt) +
            (stats.completionTokens / 1_000_000 * modelCosts.completion);
    }

    async embed(text: string): Promise<number[]> {
        const provider = this.getCurrentProvider();

        if (provider.type === "ollama") {
            const response = await fetch(`${provider.baseURL}/api/embeddings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: provider.model, prompt: text }),
            });
            const data = await response.json() as { embedding: number[] };
            return data.embedding;
        }

        const client = new OpenAI({
            apiKey: this.config.openrouter.apiKey,
            baseURL: "https://openrouter.ai/api/v1",
        });

        try {
            console.log(`🧠 Generating embedding for text (${text.length} chars) using openai/text-embedding-3-small`);
            const response = await client.embeddings.create({
                model: "openai/text-embedding-3-small",
                input: [text],
            } as any);
            return response.data[0].embedding;
        } catch (err) {
            console.error("❌ Embedding generation failed:", err);
            // Return a zero vector of correct size (1536 for text-embedding-3-small) to avoid crashing agent
            return new Array(1536).fill(0);
        }
    }

    getUsageStats(): { totalCost: number; totalCalls: number; avgLatency: number; byModel: Record<string, number> } {
        const totalCost = this.usage.reduce((sum, u) => sum + u.cost, 0);
        const totalCalls = this.usage.length;
        const avgLatency = totalCalls > 0 ? this.usage.reduce((sum, u) => sum + u.latencyMs, 0) / totalCalls : 0;

        const byModel: Record<string, number> = {};
        for (const u of this.usage) {
            byModel[u.model] = (byModel[u.model] || 0) + u.cost;
        }

        return { totalCost, totalCalls, avgLatency, byModel };
    }

    resetUsage() {
        this.usage = [];
    }
}
