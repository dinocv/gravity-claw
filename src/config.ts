import "dotenv/config";

export interface Config {
    telegram: {
        botToken: string;
        allowedUserIds: number[];
    };
    openrouter: {
        apiKey: string;
        model: string;
        preferredProviders?: string[];
    };
    anthropic?: {
        apiKey: string;
        model?: string;
    };
    google?: {
        apiKey: string;
        model?: string;
    };
    deepseek?: {
        apiKey: string;
        model?: string;
    };
    groq?: {
        apiKey: string;
        model?: string;
    };
    ollama?: {
        baseURL?: string;
        model?: string;
    };
    ollamaCloud?: {
        url?: string;
        apiKey?: string;
        model?: string;
    };
    huggingchat?: {
        model?: string;
    };
    elevenlabs: {
        apiKey: string;
    };
    agent: {
        maxIterations: number;
        thinkingLevel?: "off" | "low" | "medium" | "high";
    };
    supabase: {
        url: string;
        anonKey: string;
    };
    pinecone: {
        apiKey: string;
        indexName: string;
        host?: string;
    };
    database: {
        path: string;
    };
    security: {
        allowedCommands?: string[];
        allowedPaths?: string[];
        airGapped?: boolean;
    };
    scheduler?: {
        enabled?: boolean;
        timezone?: string;
    };
    search?: {
        provider?: "google" | "bing" | "duckduckgo" | "serpapi" | "tavily";
        apiKey?: string;
    };
    tavily?: {
        apiKey: string;
    };
    firecrawl?: {
        apiKey: string;
    };
}

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        console.error(`❌ Missing required environment variable: ${key}`);
        console.error(`   Copy .env.example to .env and fill in your values.`);
        process.exit(1);
    }
    return value;
}

function parseUserIds(raw: string): number[] {
    return raw
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
        .map((id) => {
            const num = Number(id);
            if (!Number.isInteger(num) || num <= 0) {
                console.error(`❌ Invalid user ID in ALLOWED_USER_IDS: "${id}"`);
                process.exit(1);
            }
            return num;
        });
}

export function loadConfig(): Config {
    const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
    const apiKey = requireEnv("OPENROUTER_API_KEY");
    const allowedRaw = requireEnv("ALLOWED_USER_IDS");

    const allowedUserIds = parseUserIds(allowedRaw);
    if (allowedUserIds.length === 0) {
        console.error(`❌ ALLOWED_USER_IDS must contain at least one user ID.`);
        process.exit(1);
    }
    console.log(`🔒 [Config] Whitelisted User IDs: ${allowedUserIds.join(", ")}`);

    const model = process.env.CLAUDE_MODEL || "google/gemini-2.0-flash-001";
    const elevenlabsApiKey = requireEnv("ELEVENLABS_API_KEY");
    const maxIterations = Number(process.env.MAX_ITERATIONS) || 10;
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");

    const dbPath = process.env.DB_PATH || "memory.db";

    return {
        telegram: { botToken, allowedUserIds },
        openrouter: {
            apiKey,
            model,
            preferredProviders: process.env.PREFERRED_PROVIDERS?.split(",").map(p => p.trim()),
        },
        anthropic: process.env.ANTHROPIC_API_KEY ? {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: process.env.ANTHROPIC_MODEL,
        } : undefined,
        google: process.env.GOOGLE_API_KEY ? {
            apiKey: process.env.GOOGLE_API_KEY,
            model: process.env.GOOGLE_MODEL,
        } : undefined,
        deepseek: process.env.DEEPSEEK_API_KEY ? {
            apiKey: process.env.DEEPSEEK_API_KEY,
            model: process.env.DEEPSEEK_MODEL,
        } : undefined,
        groq: process.env.GROQ_API_KEY ? {
            apiKey: process.env.GROQ_API_KEY,
            model: process.env.GROQ_MODEL,
        } : undefined,
        ollama: process.env.OLLAMA_BASE_URL ? {
            baseURL: process.env.OLLAMA_BASE_URL,
            model: process.env.OLLAMA_MODEL || "llama3.2",
        } : undefined,
        ollamaCloud: process.env.OLLAMA_CLOUD_API_KEY ? {
            url: process.env.OLLAMA_CLOUD_URL || "https://ollama.com/api",
            apiKey: process.env.OLLAMA_CLOUD_API_KEY,
            model: process.env.OLLAMA_MODEL || "llama3.2",
        } : undefined,
        huggingchat: {
            model: process.env.HUGGINGCHAT_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
        },
        elevenlabs: { apiKey: elevenlabsApiKey },
        agent: {
            maxIterations,
            thinkingLevel: (process.env.THINKING_LEVEL as any) || "medium",
        },
        supabase: { url: supabaseUrl, anonKey: supabaseAnonKey },
        pinecone: process.env.PINECONE_API_KEY ? {
            apiKey: process.env.PINECONE_API_KEY,
            indexName: process.env.PINECONE_INDEX || "gravity-claw",
            host: process.env.PINECONE_HOST
        } : { apiKey: "", indexName: "", host: undefined },
        database: { path: dbPath },
        security: {
            allowedCommands: process.env.ALLOWED_COMMANDS?.split(","),
            allowedPaths: process.env.ALLOWED_PATHS?.split(","),
            airGapped: process.env.AIR_GAPPED === "true",
        },
        scheduler: {
            enabled: process.env.SCHEDULER_ENABLED !== "false",
            timezone: process.env.SCHEDULER_TIMEZONE || "UTC",
        },
        tavily: process.env.TAVILY_API_KEY ? {
            apiKey: process.env.TAVILY_API_KEY,
        } : undefined,
        firecrawl: process.env.FIRECRAWL_API_KEY ? {
            apiKey: process.env.FIRECRAWL_API_KEY,
        } : undefined,
    };
}
