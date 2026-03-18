import { Bot, type Context, InputFile } from "grammy";
import type { Config } from "./config.js";
import type { Agent } from "./agent.js";
import type { Transcriber } from "./transcribe.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function createBot(config: Config, agent: Agent, transcriber: Transcriber): Bot {
    const bot = new Bot(config.telegram.botToken);
    const allowedIds = new Set(config.telegram.allowedUserIds);

    // Global error handler
    bot.catch((err) => {
        console.error("❌ Telegram bot error:", err);
    });

    // ── Security: User ID whitelist guard ──────────────────────────
    bot.use(async (ctx, next) => {
        const userId = ctx.from?.id;
        if (!userId || !allowedIds.has(userId)) {
            return; // silent drop
        }
        await next();
    });

    // ── /start command ─────────────────────────────────────────────
    bot.command("start", async (ctx) => {
        await ctx.reply(
            "🦀 *Gravity Claw online.*\n\nI'm your personal AI assistant. Send me a message and I'll respond.\n\n🎤 Voice messages supported — I'll transcribe and reply.\n\n🗣️ You can ask me to speak! Just say 'Send me a voice message saying...' or similar.\n\nPowered by Claude.",
            { parse_mode: "Markdown" }
        );
    });

    // ── /status command ────────────────────────────────────────────
    bot.command("status", async (ctx) => {
        const model = (agent as any).llm?.getModel?.() || "unknown";
        const stats = (agent as any).llm?.getUsageStats?.() || { totalCost: 0, totalCalls: 0, avgLatency: 0 };
        const memoryCount = await (agent as any).memory?.getMessageCount?.(ctx.from?.id.toString() || "default") || 0;

        const status = `📊 *Status*\n\n` +
            `• Model: ${model}\n` +
            `• Messages: ${stats.totalCalls}\n` +
            `• Cost: $${stats.totalCost.toFixed(4)}\n` +
            `• Avg Latency: ${stats.avgLatency.toFixed(0)}ms\n` +
            `• Memory: ${memoryCount} messages`;

        await ctx.reply(status, { parse_mode: "Markdown" });
    });

    // ── /model command ──────────────────────────────────────────────
    bot.command("model", async (ctx) => {
        const message = ctx.message;
        if (!message) return;

        const args = message.text.split(" ");
        if (args.length < 2) {
            const current = (agent as any).llm?.getModel?.() || "unknown";
            await ctx.reply(`Current model: ${current}\n\nChange with: /model <name>`);
            return;
        }

        const newModel = args[1];
        (agent as any).llm?.setModel?.(newModel);
        await ctx.reply(`Model changed to: ${newModel}`);
    });

    // ── /compact command ─────────────────────────────────────────────
    bot.command("compact", async (ctx) => {
        await indicateTyping(ctx);

        const userId = ctx.from?.id.toString() || "default";
        const result = await (agent as any).memory?.compact?.(userId);

        await ctx.reply(result || "Compacted memory.");
    });

    // ── /usage command ──────────────────────────────────────────────
    bot.command("usage", async (ctx) => {
        const stats = (agent as any).llm?.getUsageStats?.() || { totalCost: 0, totalCalls: 0, avgLatency: 0, byModel: {} };

        let byModelStr = "";
        for (const [model, cost] of Object.entries(stats.byModel)) {
            byModelStr += `• ${model}: $${(cost as number).toFixed(4)}\n`;
        }

        const usage = `💰 *Usage Stats*\n\n` +
            `• Total Calls: ${stats.totalCalls}\n` +
            `• Total Cost: $${stats.totalCost.toFixed(4)}\n` +
            `• Avg Latency: ${stats.avgLatency.toFixed(0)}ms\n\n` +
            `*By Model:*\n${byModelStr || "No data"}`;

        await ctx.reply(usage, { parse_mode: "Markdown" });
    });

    // ── /new command ────────────────────────────────────────────────
    bot.command("new", async (ctx) => {
        const userId = ctx.from?.id.toString() || "default";
        await (agent as any).memory?.clearHistory?.(userId);
        await ctx.reply("🆕 Started new conversation. Previous context cleared.");
    });

    // ── /think command ──────────────────────────────────────────────
    bot.command("think", async (ctx) => {
        const message = ctx.message;
        if (!message) return;

        const args = message.text.split(" ");
        if (args.length < 2) {
            await ctx.reply("Thinking levels: off, low, medium, high\n\nChange with: /think <level>");
            return;
        }

        const level = args[1].toLowerCase();
        const validLevels = ["off", "low", "medium", "high"];

        if (!validLevels.includes(level)) {
            await ctx.reply(`Invalid level. Choose from: ${validLevels.join(", ")}`);
            return;
        }

        await ctx.reply(`Thinking level set to: ${level}`);
    });

    // ── /help command ────────────────────────────────────────────────
    bot.command("help", async (ctx) => {
        const help = `📖 *Commands*\n\n` +
            `/start - Start the bot\n` +
            `/status - Show bot status\n` +
            `/model <name> - Switch LLM model\n` +
            `/compact - Compact conversation memory\n` +
            `/usage - Show usage statistics\n` +
            `/new - Start new conversation\n` +
            `/think <level> - Set thinking level\n` +
            `/help - Show this help`;

        await ctx.reply(help, { parse_mode: "Markdown" });
    });

    // ── Text messages → Agent loop ─────────────────────────────────
    bot.on("message:text", async (ctx) => {
        const text = ctx.message?.text;
        if (!text || text.startsWith("/")) return;

        console.log(`📩 Received: "${text}"`);

        // Create a timeout to prevent indefinite hangs
        const TIMEOUT_MS = 120000; // 2 minutes max
        let timeoutHandle: NodeJS.Timeout | undefined = undefined;

        try {
            // Show typing indicator
            await indicateTyping(ctx);

            // Create timeout wrapper for agent.run
            const agentResponsePromise = agent.run(text, ctx.chat.id.toString());

            timeoutHandle = setTimeout(async () => {
                console.error(`⏱️ [TIMEOUT] Agent response timed out after ${TIMEOUT_MS}ms`);
                try {
                    await ctx.reply("⏱️ Sorry, that took too long. Try a simpler request.");
                } catch { }
            }, TIMEOUT_MS);

            const agentResponse = await agentResponsePromise;
            clearTimeout(timeoutHandle);
            console.log(`📤 Received response from agent (text length: ${agentResponse.text.length})`);

            // If the response is just our voice marker, don't send it as text
            const textToReply = agentResponse.text.trim();
            const isJustVoiceMarker = textToReply === "__VOICE_MESSAGE_SENT__";

            if (!isJustVoiceMarker && textToReply && textToReply !== "(no response)") {
                console.log(`📤 Sending text response: "${textToReply.slice(0, 50)}..."`);
                await sendLongMessage(ctx, textToReply);
                console.log(`✅ Text response sent`);
            } else if (isJustVoiceMarker) {
                console.log(`ℹ️ skipping text reply as voice tool was used`);
            }

            try {
                await sendAudioResponses(ctx, agentResponse.audioPaths);
                console.log(`✅ Audio responses sent`);
            } catch (audioErr) {
                console.error(`❌ Error sending audio: ${audioErr}`);
            }
        } catch (err) {
            // Clear timeout if it exists to prevent memory leaks and stray messages
            if (typeof timeoutHandle !== 'undefined') {
                clearTimeout(timeoutHandle);
            }
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`❌ Agent error:`, err);

            // Try to send error message to user with retry
            try {
                let retries = 3;
                while (retries > 0) {
                    try {
                        await ctx.reply(`⚠️ Got an error: ${errMsg.slice(0, 200)}. Let me try again...`);
                        break;
                    } catch {
                        retries--;
                        if (retries === 0) throw err;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            } catch (e) {
                console.error(`❌ Could not send error message:`, e);
            }
        }
    });

    // ── Voice messages → Transcribe + Echo + Agent ─────────────────
    bot.on("message:voice", async (ctx) => {
        await indicateTyping(ctx);

        let tmpFile: string | null = null;

        try {
            const file = await ctx.getFile();
            const filePath = file.file_path;

            if (!filePath) {
                await ctx.reply("⚠️ Couldn't download voice message.");
                return;
            }

            tmpFile = path.join(os.tmpdir(), `gc_voice_${Date.now()}.ogg`);
            const fileUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;
            const response = await fetch(fileUrl);

            if (!response.ok) {
                await ctx.reply("⚠️ Failed to download voice file from Telegram.");
                return;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(tmpFile, buffer);
            console.log(`🎤 Downloaded voice file: ${buffer.length} bytes`);

            // Transcribe with retry
            console.log("🎤 Transcribing voice message...");
            let transcript = "";
            let retries = 3;
            while (retries > 0) {
                try {
                    transcript = await transcriber.transcribe(tmpFile);
                    break;
                } catch (err) {
                    retries--;
                    if (retries === 0) throw err;
                    console.log(`🎤 Retrying transcription, attempts left: ${retries}`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            console.log(`🎤 Transcript: "${transcript}"`);

            if (!transcript || transcript.trim().length === 0) {
                await ctx.reply("🎤 Couldn't make out what you said. Try again?");
                return;
            }

            await ctx.reply(`🎤 *You said:*\n"${transcript}"`, { parse_mode: "Markdown" });

            await indicateTyping(ctx);
            let agentResponse = await agent.run(transcript, ctx.chat.id.toString(), true);

            // Fallback if no response
            if (!agentResponse.text || agentResponse.text === "(no response)" || agentResponse.text.trim() === "") {
                console.log("⚠️ No agent response - using fallback");
                agentResponse.text = "I heard you! Let me respond to that.";
            }

            // Force voice response for voice messages
            if (agentResponse.audioPaths.length === 0) {
                console.log("🎤 No voice generated - forcing voice response...");
                try {
                    const tts = await import("./tts.js");
                    const ttsGenerator = new tts.TTS(process.env.ELEVENLABS_API_KEY || "");
                    const voiceText = agentResponse.text.slice(0, 1000); // Limit text length
                    const audioPath = await ttsGenerator.generateSpeech(voiceText);
                    if (audioPath) {
                        agentResponse.audioPaths.push(audioPath);
                    }
                } catch (e) {
                    console.error("Force voice failed:", e);
                }
            }

            // If the response is just our voice marker, don't send it as text
            const textToReply = agentResponse.text.trim();
            const isJustVoiceMarker = textToReply === "__VOICE_MESSAGE_SENT__";

            if (!isJustVoiceMarker && textToReply && textToReply !== "(no response)") {
                await sendLongMessage(ctx, textToReply);
            }

            await sendAudioResponses(ctx, agentResponse.audioPaths);

        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`❌ Voice error:`, err);
            try {
                await ctx.reply(`⚠️ Voice error: ${errMsg.slice(0, 200)}`);
            } catch { }
        } finally {
            if (tmpFile && fs.existsSync(tmpFile)) {
                try { fs.unlinkSync(tmpFile); } catch { }
            }
        }
    });

    bot.on("message:photo", async (ctx) => {
        await indicateTyping(ctx);

        try {
            const photo = ctx.message?.photo?.pop();
            if (!photo) return;

            const file = await ctx.getFile();
            const filePath = file.file_path;

            if (!filePath) {
                await ctx.reply("⚠️ Couldn't download photo.");
                return;
            }

            const fileUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;
            const response = await fetch(fileUrl);

            if (!response.ok) {
                await ctx.reply("⚠️ Failed to download photo.");
                return;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const base64Image = buffer.toString("base64");
            const caption = ctx.message?.caption || "(no caption)";

            console.log(`📷 Received image with caption: "${caption}"`);

            const agentResponse = await agent.run(caption, ctx.chat.id.toString(), false, base64Image);

            if (agentResponse.text && agentResponse.text !== "(no response)") {
                await sendLongMessage(ctx, agentResponse.text);
            }

            await sendAudioResponses(ctx, agentResponse.audioPaths);

        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`❌ Photo error: ${errMsg}`);
            await ctx.reply("⚠️ Photo processing failed.");
        }
    });

    return bot;
}

async function indicateTyping(ctx: Context): Promise<void> {
    try {
        await ctx.replyWithChatAction("typing");
    } catch {
        // Non-critical
    }
}

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) {
        console.error("📤 [sendLongMessage] No chat ID found");
        return;
    }

    const MAX_LENGTH = 4096;
    if (text.length <= MAX_LENGTH) {
        console.log(`📤 [sendLongMessage] Replying with text length: ${text.length}`);
        try {
            let retries = 3;
            while (retries > 0) {
                try {
                    const result = await ctx.api.sendMessage(chatId, text);
                    console.log(`📤 [sendLongMessage] Reply sent, message_id: ${result.message_id}`);
                    return;
                } catch (err) {
                    retries--;
                    if (retries === 0) throw err;
                    console.log(`📤 [sendLongMessage] Retry, attempts left: ${retries}`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        } catch (err) {
            console.error(`📤 [sendLongMessage] Reply failed:`, err);
            throw err;
        }
        return;
    }

    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
        if (remaining.length <= MAX_LENGTH) {
            chunks.push(remaining);
            break;
        }
        let splitAt = remaining.lastIndexOf("\n", MAX_LENGTH);
        if (splitAt <= 0) splitAt = MAX_LENGTH;
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).trimStart();
    }
    for (const chunk of chunks) {
        let retries = 3;
        while (retries > 0) {
            try {
                await ctx.api.sendMessage(chatId, chunk);
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
}

async function sendAudioResponses(ctx: Context, audioPaths: string[]): Promise<void> {
    for (const audioPath of audioPaths) {
        try {
            // Send as audio file instead of voice to avoid 405 errors
            await ctx.replyWithAudio(new InputFile(audioPath));
        } catch (err) {
            console.error(`❌ Failed to send voice message: ${err}`);
            // Try sending as regular file if audio fails
            try {
                await ctx.replyWithDocument(new InputFile(audioPath));
            } catch (err2) {
                console.error(`❌ Failed to send as document: ${err2}`);
            }
        } finally {
            if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
            }
        }
    }
}
