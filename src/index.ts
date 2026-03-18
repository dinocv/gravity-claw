import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { InputFile } from "grammy";
import { loadConfig } from "./config.js";
import { Agent } from "./agent.js";
import { Transcriber } from "./transcribe.js";
import { TTS } from "./tts.js";
import { createBot } from "./bot.js";
import { MCPManager } from "./mcp.js";
import { HeartbeatManager } from "./heartbeat.js";
import { TaskScheduler, schedulerToolsDef } from "./scheduler.js";
import { registerMemoryTools, registerShellTools, registerResearchTools, registerFileTools, registerBrowserTools, registerPythonTools, registerSelfCorrectionTools, registerYouTubeTools } from "./tools/index.js";
import { SkillManager } from "./skill-manager.js";
import { MessageRouter } from "./router.js";
import { SwarmManager } from "./swarm.js";
import { WebhookServer } from "./webhook.js";
import { vault } from "./vault.js";
import { PluginRegistry } from "./plugins.js";
import { RecommendationsEngine } from "./recommendations.js";
import { AutonomousBrain } from "./autonomous-brain.js";
import { CalendarManager, GmailManager } from "./integrations.js";
import { CryptoManager, SmartHomeManager } from "./smart-home.js";

console.log("🦀 Gravity Claw starting...");

const config = loadConfig();

console.log(`📡 Model: ${config.openrouter.model}`);
console.log(`🔒 Allowed users: ${config.telegram.allowedUserIds.length}`);
console.log(`🔄 Max iterations: ${config.agent.maxIterations}`);
console.log(`🎤 Voice: Enabled`);
console.log(`🗣️ TTS: ElevenLabs enabled`);
console.log(`🧠 Thinking level: ${config.agent.thinkingLevel || "medium"}`);

const agent = new Agent(config);
const transcriber = new Transcriber(config);
const tts = new TTS(config.elevenlabs.apiKey);

// Initialize managers
const autonomousBrain = new AutonomousBrain(agent, config);
const cryptoManager = new CryptoManager();
const smartHomeManager = new SmartHomeManager();

// Calendar & Gmail managers (mock for now - need OAuth setup for real access)
const calendarManager = new CalendarManager("");
const gmailManager = new GmailManager("");
autonomousBrain.start().then(() => {
    console.log("🧠 Autonomous Brain initialized - I'm learning about you!");
});

const mcp = new MCPManager(agent);
mcp.init().then(() => {
    console.log("✅ MCP Initialization complete.");
}).catch(err => {
    console.error("❌ MCP Initialization failed:", err);
});

const scheduler = new TaskScheduler(agent, config);

scheduler.registerTask(
    "daily_intel",
    "Daily Intelligence Report",
    "0 8 * * *",
    "Research the top 3 breakthroughs in Autonomous AI Agents from the last 24 hours and summarize them for my morning briefing.",
    async (task, agent) => {
        console.log("📡 Running Daily Intelligence Report...");
        const res = await agent.run(task.action, "scheduler");
        return res.text;
    }
);

scheduler.registerTask(
    "startup_greeting",
    "Startup Greeting",
    "0 9 * * *",
    "Send a morning greeting to the user. Be warm, proactive, and ask if there's anything they need help with today.",
    async (task, agent) => {
        console.log("👋 Sending startup greeting...");
        const res = await agent.run("Greet the user warmly. Ask if there's anything they need help with today. Use text_to_speech.", "scheduler");
        return "Greeting sent";
    }
);

scheduler.registerTask(
    "evening_reflection",
    "Evening Reflection",
    "0 21 * * *",
    "Ask the user how their day went. What did they accomplish? Any challenges? Offer tomorrow's priorities.",
    async (task, agent) => {
        const res = await agent.run("Ask the user about their day. What did they accomplish? Any challenges? Be conversational and supportive.", "scheduler");
        return res.text.slice(0, 100) + "...";
    }
);

scheduler.registerTask(
    "weekly_research",
    "Weekly Deep Research",
    "0 10 * * 0",
    "Research the most important topic the user has mentioned recently and provide a comprehensive summary.",
    async (task, agent) => {
        const res = await agent.run("Based on our recent conversations, identify the most interesting or important topic and research it deeply. Provide actionable insights.", "scheduler");
        return res.text.slice(0, 200) + "...";
    }
);

scheduler.registerTask(
    "memory_curation",
    "MEMORY.md Auto-Curation",
    "0 5 * * 3,0",
    "Curate and clean up MEMORY.md - remove stale info, update numbers, keep only relevant facts. Keep under 400 lines.",
    async (task, agent) => {
        console.log("🧠 Running memory curation...");
        const res = await agent.run(`You are a memory curator. Your task is to clean up MEMORY.md in the current directory.

1. Read MEMORY.md
2. Identify what's stale (old dates, outdated info) vs current
3. Rewrite it with only relevant, current information
4. Keep the same sections but shorten them
5. Update the "Last updated" date to today
6. Keep under 400 lines total

Be brutal - remove anything that no longer matters.`, "scheduler");
        return "Memory curated: " + res.text.slice(0, 100) + "...";
    }
);

scheduler.start();

registerMemoryTools(agent);
registerShellTools(agent);
registerResearchTools(agent);
registerFileTools(agent, config);
registerBrowserTools(agent);
registerPythonTools(agent);
registerSelfCorrectionTools(agent);

const skillManager = new SkillManager(agent);
skillManager.discoverAndRegister().then(() => {
    console.log("✅ Skills Discovery complete.");
}).catch(err => {
    console.error("❌ Skills Discovery failed:", err);
});

const router = new MessageRouter(agent);

const swarm = new SwarmManager(agent);

const plugins = new PluginRegistry(agent);

const recommendations = new RecommendationsEngine(agent, config);

console.log(`🔒 Secrets Vault initialized. Keys stored: ${vault.list().length}`);

const webhookPort = parseInt(process.env.WEBHOOK_PORT || "3001", 10);
if (process.env.ENABLE_WEBHOOK === "true") {
    const webhookServer = new WebhookServer(agent, webhookPort);
    webhookServer.start();
}

agent.registerTool(
    {
        type: "function",
        function: {
            name: "spawn_agent",
            description: "Spawn a specialized sub-agent (researcher, coder, reviewer, planner) to handle a subtask. Use this to delegate complex work.",
            parameters: {
                type: "object",
                properties: {
                    role: { type: "string", enum: ["researcher", "coder", "reviewer", "planner"] },
                    task: { type: "string", description: "The specific task for the sub-agent." }
                },
                required: ["role", "task"]
            }
        }
    },
    async (args: any) => {
        return await swarm.runSubAgent(args.role, args.task, "swarm");
    }
);

agent.registerTool(
    {
        type: "function",
        function: {
            name: "mesh_workflow",
            description: "Run a full autonomous Mesh Workflow: decomposes goal → researcher → coder → reviewer. Use for complex multi-step goals.",
            parameters: {
                type: "object",
                properties: {
                    goal: { type: "string", description: "The high-level goal to achieve." }
                },
                required: ["goal"]
            }
        }
    },
    async (args: any) => {
        return await swarm.runMeshWorkflow(args.goal, "swarm");
    }
);

agent.registerTool(
    {
        type: "function",
        function: {
            name: "vault",
            description: "Manage encrypted secrets. Store, retrieve, or list secret keys in the AES-256 vault.",
            parameters: {
                type: "object",
                properties: {
                    operation: { type: "string", enum: ["set", "get", "list", "delete"] },
                    key: { type: "string" },
                    value: { type: "string" }
                },
                required: ["operation"]
            }
        }
    },
    async (args: any) => {
        switch (args.operation) {
            case "set": vault.set(args.key, args.value); return `✅ Secret '${args.key}' stored securely.`;
            case "get": return vault.get(args.key) ?? `❌ Secret '${args.key}' not found.`;
            case "list": return `Vault keys: ${vault.list().join(", ") || "(empty)"}`;
            case "delete": return vault.delete(args.key) ? `🗑️ '${args.key}' deleted.` : `❌ Key not found.`;
            default: return "Unknown vault operation.";
        }
    }
);

agent.registerTool(
    {
        type: "function",
        function: {
            name: "text_to_speech",
            description: "Converts text to speech and sends a voice message. Use this if the user says 'Speak...', 'Say...', 'Tell me...', or if they explicitly ask for a voice message or to hear you. When using this tool, make the 'text' argument the actual words you want to speak.",
            parameters: {
                type: "object",
                properties: {
                    text: {
                        type: "string",
                        description: "The text to convert to speech.",
                    },
                },
                required: ["text"],
            },
        },
    },
    async (args) => {
        const text = args.text as string;
        try {
            console.log(`🗣️  Generating speech: "${text.slice(0, 30)}..."`);
            const audioPath = await tts.generateSpeech(text);
            agent.queueAudio(audioPath);
            return "__VOICE_MESSAGE_SENT__";
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            return `Error: ${errMsg}`;
        }
    }
);

agent.registerTool(
    {
        type: "function",
        function: {
            name: "planner",
            description: "Enforce the 'Think Before Act' protocol by generating a structured Task Manifesto. Use this BEFORE starting any complex task.",
            parameters: {
                type: "object",
                properties: {
                    objective: {
                        type: "string",
                        description: "The final successful outcome.",
                    },
                    milestones: {
                        type: "array",
                        items: { type: "string" },
                        description: "3–5 logical sub-tasks.",
                    },
                    toolbox: {
                        type: "array",
                        items: { type: "string" },
                        description: "Specific tools to be used."
                    }
                },
                required: ["objective", "milestones", "toolbox"]
            }
        }
    },
    async (args: any) => {
        try {
            const planPath = path.join(process.cwd(), "PLAN.md");
            let content = "# Gravity Claw: Task Manifesto (Manus Style)\n\n";
            content += `*Generated: ${new Date().toLocaleString()}*\n\n`;
            content += `## Objective\n${args.objective}\n\n`;
            content += `## Milestones\n${args.milestones.map((m: string, i: number) => `${i + 1}. ${m}`).join("\n")}\n\n`;
            content += `## Toolbox\n${args.toolbox.map((t: string) => `- \`${t}\``).join("\n")}\n\n`;
            content += "## Status\n⏳ Awaiting execution/approval...\n";

            await fs.promises.writeFile(planPath, content, "utf-8");
            console.log("📝 PLAN.md updated.");

            return `SUCCESS: Task Manifesto logged to PLAN.md. Please present this to the user for approval before continuing with tools.\n\n${content}`;
        } catch (err) {
            return `Error logging plan: ${err}`;
        }
    }
);

agent.registerTool(
    schedulerToolsDef,
    async (args) => {
        const op = args.operation as string;
        switch (op) {
            case "list":
                const tasks = await scheduler.listTasks();
                return JSON.stringify(tasks, null, 2);
            case "enable":
                return await scheduler.enableTask(args.taskId as string);
            case "disable":
                return await scheduler.disableTask(args.taskId as string);
            case "delete":
                return await scheduler.deleteTask(args.taskId as string);
            case "run":
                return await scheduler.runTaskNow(args.taskId as string);
            case "add":
                return await scheduler.addCustomTask(
                    args.name as string,
                    args.cronExpression as string,
                    args.action as string,
                    async (_, agent) => {
                        const res = await agent.run(args.action as string, "scheduler");
                        return res.text;
                    }
                );
            default:
                return `Unknown operation: ${op}`;
        }
    }
);

agent.registerTool(
    {
        type: "function",
        function: {
            name: "who_am_i",
            description: "Tell the user what you know about them - your profile, preferences, facts stored about them.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    async () => {
        return await autonomousBrain.getUserProfile();
    }
);

// Tool: crypto_prices
agent.registerTool(
    {
        type: "function",
        function: {
            name: "crypto_prices",
            description: "Get current cryptocurrency prices for Bitcoin, Ethereum, Solana, Cardano, Dogecoin.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    async () => {
        const prices = await cryptoManager.getPrices();
        let msg = "💰 Crypto Prices:\n";
        for (const [coin, price] of Object.entries(prices)) {
            msg += `• ${coin}: $${price.toLocaleString()}\n`;
        }
        return msg;
    }
);

// Tool: smart_home
agent.registerTool(
    {
        type: "function",
        function: {
            name: "smart_home",
            description: "Control smart home devices - lights, thermostat. Actions: on, off, toggle, status.",
            parameters: {
                type: "object",
                properties: {
                    room: { type: "string", description: "Room name (living_room, bedroom)" },
                    action: { type: "string", description: "Action: on, off, toggle, status, temperature" },
                    value: { type: "number", description: "For temperature or brightness" },
                },
                required: ["room", "action"],
            },
        },
    },
    async (args: any) => {
        if (args.action === "status") {
            return await smartHomeManager.getStatus();
        }
        if (args.room === "thermostat" || args.action === "temperature") {
            return await smartHomeManager.setTemperature(args.value || 72);
        }
        return await smartHomeManager.controlLight(args.room || "living_room", args.action, args.value);
    }
);

// Tool: calendar
agent.registerTool(
    {
        type: "function",
        function: {
            name: "calendar",
            description: "Manage Google Calendar - list events, create events, delete events.",
            parameters: {
                type: "object",
                properties: {
                    operation: { type: "string", enum: ["list", "create", "delete"] },
                    title: { type: "string", description: "Event title (for create)" },
                    date: { type: "string", description: "Date/time (for create)" },
                    eventId: { type: "string", description: "Event ID (for delete)" },
                },
                required: ["operation"],
            },
        },
    },
    async (args) => {
        if (!calendarManager) {
            return "❌ Calendar not connected. Set up Google Calendar OAuth.";
        }
        switch (args.operation) {
            case "list":
                const events = await calendarManager.listEvents();
                if (events.length === 0) return "📅 No upcoming events";
                return "📅 Upcoming:\n" + events.map((e: any) =>
                    `• ${e.summary} - ${new Date(e.start?.dateTime || e.start?.date).toLocaleString()}`
                ).join("\n");
            case "create":
                const start = new Date(args.date as string);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                const link = await calendarManager.createEvent({
                    summary: args.title as string,
                    start,
                    end,
                });
                return link ? `✅ Event created: ${link}` : "❌ Failed to create event";
            default:
                return "Unknown operation";
        }
    }
);

// Tool: email
agent.registerTool(
    {
        type: "function",
        function: {
            name: "email",
            description: "Manage emails - list recent, send email.",
            parameters: {
                type: "object",
                properties: {
                    operation: { type: "string", enum: ["list", "send"] },
                    to: { type: "string", description: "Recipient email" },
                    subject: { type: "string", description: "Email subject" },
                    body: { type: "string", description: "Email body" },
                },
                required: ["operation"],
            },
        },
    },
    async (args) => {
        if (!gmailManager) {
            return "❌ Gmail not connected. Set up Google OAuth.";
        }
        switch (args.operation) {
            case "list":
                const emails = await gmailManager.listEmails();
                if (emails.length === 0) return "📧 No recent emails";
                return "📧 Recent:\n" + emails.map((e: any) =>
                    `• ${e.from}: ${e.subject}`
                ).join("\n");
            case "send":
                const sent = await gmailManager.sendEmail(args.to as string, args.subject as string, args.body as string);
                return sent ? "✅ Email sent" : "❌ Failed to send";
            default:
                return "Unknown operation";
        }
    }
);

// Tool: system_status
agent.registerTool(
    {
        type: "function",
        function: {
            name: "system_status",
            description: "Get status of all connected systems and integrations.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    async () => {
        const prices = await cryptoManager.getPrices();
        const smartHome = await smartHomeManager.getDevices();

        return `📊 System Status:

🧠 AI: Ollama + OpenRouter
💰 Crypto: ${Object.keys(prices).length} coins tracked
🏠 Smart Home: ${Object.keys(smartHome).length} devices
📧 Gmail: ${gmailManager.getStatus()}
📅 Calendar: ${calendarManager.getStatus()}`;
    }
);

const bot = createBot(config, agent, transcriber);

const primaryUser = config.telegram.allowedUserIds[0].toString();
const heartbeat = new HeartbeatManager(agent, bot, primaryUser);
heartbeat.start();

function shutdown(signal: string) {
    console.log(`\n⏹️  ${signal} received. Shutting down...`);
    autonomousBrain.stop();
    bot.stop();
    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── Robust Bot Lifecycle Management ──
let isBotRunning = false;
let restartTimeout: NodeJS.Timeout | null = null;

async function startBot() {
    if (isBotRunning) {
        console.log("⏳ Bot already running, skipping start...");
        return;
    }

    isBotRunning = true;

    try {
        await bot.start({
            onStart: async (botInfo) => {
                console.log(`\n✅ Gravity Claw is live!`);
                console.log(`   Bot: @${botInfo.username}`);
                console.log(`   Mode: long-polling (no exposed ports)`);
                console.log(`   Ready for messages.\n`);

                setTimeout(async () => {
                    try {
                        const greeting = "🎙️ *Gravity Claw online.*\n\nI'm back and ready. What do you need?";
                        await bot.api.sendMessage(primaryUser, greeting, { parse_mode: "Markdown" });

                        const voiceRes = await agent.run("Say: I'm back online. What can I help you with today?", "scheduler", true);
                        for (const audioPath of voiceRes.audioPaths) {
                            try {
                                await bot.api.sendAudio(primaryUser, new InputFile(audioPath));
                            } catch (err) {
                                console.error("❌ Voice send failed:", err);
                            }
                        }
                    } catch (err) {
                        console.error("❌ Startup greeting failed:", err);
                    }
                }, 3000);
            },
        });
    } catch (err: any) {
        console.error("❌ Bot start error:", err);
        isBotRunning = false;

        // Check for 409 Conflict - this means another bot instance is running
        // DO NOT auto-restart on this fatal error - it requires manual intervention
        if (err?.error_code === 409 || err?.description?.includes("409")) {
            console.error("💡 FATAL: Another bot instance is already running!");
            console.error("💡 Please stop the other instance before starting a new one.");
            console.error("💡 Run 'taskkill /F /IM node.exe' to kill all node processes, then restart.");
            return; // Don't restart - this is a fatal error
        }

        // Auto-restart with exponential backoff for other errors
        const delayMs = 5000;
        console.log(`🔄 Restarting bot in ${delayMs}ms...`);
        restartTimeout = setTimeout(() => {
            startBot();
        }, delayMs);
    }
}

// ── Get webhook URL configuration ──
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Handle bot stopping unexpectedly - use GrammyError for api errors
bot.api.config.use(async (prev, method, opts, bot) => {
    try {
        return await prev(method, opts);
    } catch (error) {
        console.error("❌ Bot API error:", error);
        isBotRunning = false;

        // Schedule restart if not already scheduled
        if (!restartTimeout) {
            console.log("🔄 Scheduling bot restart...");
            restartTimeout = setTimeout(() => {
                restartTimeout = null;
                startBot();
            }, 5000);
        }

        throw error;
    }
});

// Start the bot (long-polling mode)
if (!WEBHOOK_URL) {
    startBot();
}

if (WEBHOOK_URL) {
    console.log(`🔗 Using webhook mode: ${WEBHOOK_URL}`);

    import("http").then(http => {
        const port = parseInt(process.env.PORT || "3000");

        bot.api.setWebhook(WEBHOOK_URL).then(() => {
            console.log(`✅ Webhook set to: ${WEBHOOK_URL}`);
        }).catch(err => {
            console.error(`❌ Failed to set webhook:`, err);
        });

        const server = http.createServer(async (req, res) => {
            if (req.method === "POST") {
                try {
                    const chunks: Buffer[] = [];
                    for await (const chunk of req) {
                        chunks.push(chunk);
                    }
                    const body = Buffer.concat(chunks).toString();
                    await bot.handleUpdate(JSON.parse(body));
                    res.writeHead(200);
                    res.end("OK");
                } catch (err) {
                    console.error(`❌ Handle error:`, err);
                    res.statusCode = 500;
                    res.end("Error");
                }
            } else {
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("Gravity Claw is running!");
            }
        });

        server.listen(port, () => {
            console.log(`✅ Server listening on port ${port}`);
        });
    });
}
