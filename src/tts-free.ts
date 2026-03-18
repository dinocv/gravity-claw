import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type TTSProvider = "elevenlabs" | "piper" | "coqui" | "edge";

export interface TTSConfig {
    provider: TTSProvider;
    elevenlabsApiKey?: string;
    piperPath?: string;  // Path to piper executable
    coquiModel?: string;
}

/**
 * Free unlimited TTS module supporting multiple providers:
 * - Piper (local, free, fast)
 * - Coqui (local, free, high quality)
 * - Edge TTS (free, cloud-based)
 * - ElevenLabs (paid fallback)
 */
export class FreeTTS {
    private config: TTSConfig;
    private elevenlabsApiKey?: string;

    constructor(config: TTSConfig) {
        this.config = config;
        this.elevenlabsApiKey = config.elevenlabsApiKey;
    }

    /**
     * Generate speech from text using free local/cloud TTS
     */
    async generateSpeech(text: string): Promise<string> {
        // Truncate text to avoid overly long outputs
        const truncatedText = text.slice(0, 2500);

        switch (this.config.provider) {
            case "piper":
                return this.generateWithPiper(truncatedText);
            case "coqui":
                return this.generateWithCoqui(truncatedText);
            case "edge":
                return this.generateWithEdge(truncatedText);
            case "elevenlabs":
            default:
                return this.generateWithElevenLabs(truncatedText);
        }
    }

    /**
     * Piper TTS - Fast, local, free
     * Install: https://github.com/rhasspy/piper
     * Download model: https://rhasspy.github.io/piper-voices/
     */
    private async generateWithPiper(text: string): Promise<string> {
        const piperPath = this.config.piperPath || "piper";
        const modelPath = process.env.PIPER_MODEL_PATH || "";

        if (!modelPath) {
            console.warn("⚠️ PIPER_MODEL_PATH not set, falling back to Edge TTS");
            return this.generateWithEdge(text);
        }

        const tmpInput = path.join(os.tmpdir(), `gc_tts_input_${Date.now()}.txt`);
        const tmpOutput = path.join(os.tmpdir(), `gc_tts_${Date.now()}.wav`);

        try {
            // Write text to temp file
            fs.writeFileSync(tmpInput, text, "utf-8");

            // Run piper
            const cmd = `${piperPath} --model ${modelPath} --input_file ${tmpInput} --output_file ${tmpOutput}`;
            await execAsync(cmd);

            // Convert to mp3 using ffmpeg if available
            const mp3Output = tmpOutput.replace(".wav", ".mp3");
            try {
                await execAsync(`ffmpeg -i ${tmpOutput} -y ${mp3Output}`);
                fs.unlinkSync(tmpOutput);
                fs.unlinkSync(tmpInput);
                console.log(`✅ Piper TTS generated: ${mp3Output}`);
                return mp3Output;
            } catch {
                // Return wav if ffmpeg not available
                fs.unlinkSync(tmpInput);
                console.log(`✅ Piper TTS generated: ${tmpOutput}`);
                return tmpOutput;
            }
        } catch (err) {
            console.error("❌ Piper TTS failed:", err);
            // Fallback to Edge TTS
            return this.generateWithEdge(text);
        }
    }

    /**
     * Coqui TTS - High quality local TTS
     * Install: pip install coqui-tts
     */
    private async generateWithCoqui(text: string): Promise<string> {
        // For Coqui, we need Python - this is a placeholder
        // In production, you'd run: python -m TTS --text "..." --outfile ...
        console.warn("⚠️ Coqui TTS requires Python installation. Use Piper for simpler setup.");
        return this.generateWithEdge(text);
    }

    /**
     * Edge TTS - Free Microsoft cloud TTS
     * No API key required, uses Edge browser's TTS
     */
    private async generateWithEdge(text: string): Promise<string> {
        const { EdgeTTS } = await import("edge-tts");

        const voices = [
            "en-US-AriaNeural",  // Standard female
            "en-US-GuyNeural",   // Standard male
            "en-GB-SoniaNeural", // British female
        ];

        const voice = voices[Math.floor(Math.random() * voices.length)];
        const tmpFile = path.join(os.tmpdir(), `gc_tts_${Date.now()}.mp3`);

        try {
            const tts = new EdgeTTS();
            await tts.synthesize(text, voice, tmpFile);

            console.log(`✅ Edge TTS generated: ${tmpFile}`);
            return tmpFile;
        } catch (err) {
            console.error("❌ Edge TTS failed:", err);
            // Final fallback to ElevenLabs
            if (this.elevenlabsApiKey) {
                return this.generateWithElevenLabs(text);
            }
            throw new Error("All TTS providers failed");
        }
    }

    /**
     * ElevenLabs - Paid fallback
     */
    private async generateWithElevenLabs(text: string): Promise<string> {
        if (!this.elevenlabsApiKey) {
            throw new Error("ElevenLabs API key not available");
        }

        const url = `https://api.elevenlabs.io/v1/text-to-speech/nPczCjzI2devNBz1zQrb`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": this.elevenlabsApiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`ElevenLabs error: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const tmpFile = path.join(os.tmpdir(), `gc_tts_${Date.now()}.mp3`);
            fs.writeFileSync(tmpFile, buffer);

            console.log(`✅ ElevenLabs TTS generated: ${tmpFile}`);
            return tmpFile;
        } catch (err) {
            console.error("❌ ElevenLabs TTS failed:", err);
            throw err;
        }
    }

    /**
     * Check which TTS providers are available
     */
    async checkProviders(): Promise<Record<string, boolean>> {
        const status: Record<string, boolean> = {
            elevenlabs: !!this.elevenlabsApiKey,
            piper: false,
            coqui: false,
            edge: true,  // Always available
        };

        // Check if piper is available
        try {
            const piperPath = this.config.piperPath || "piper";
            await execAsync(`${piperPath} --version`);
            status.piper = true;
        } catch {
            status.piper = false;
        }

        return status;
    }
}

/**
 * Create a TTS instance based on config
 * Priority: Piper > Edge > ElevenLabs
 */
export function createFreeTTS(config: Partial<TTSConfig> & { elevenlabsApiKey?: string }): FreeTTS {
    // Determine best available provider
    let provider: TTSProvider = "edge";  // Default to Edge (free, no setup)

    if (config.provider) {
        provider = config.provider;
    } else if (process.env.PIPER_MODEL_PATH) {
        provider = "piper";
    }

    return new FreeTTS({
        provider,
        elevenlabsApiKey: config.elevenlabsApiKey,
        piperPath: config.piperPath,
    });
}
