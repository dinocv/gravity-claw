import OpenAI from "openai";
import type { Config } from "./config.js";
import fs from "node:fs";
import path from "node:path";

export class Transcriber {
    private client: OpenAI;
    private useGroq: boolean = false;

    constructor(config: Config) {
        // Use Groq for faster transcription (free tier available)
        if (config.groq?.apiKey) {
            this.useGroq = true;
            this.client = new OpenAI({
                apiKey: config.groq.apiKey,
                baseURL: "https://api.groq.com/openai/v1",
            });
        } else {
            // Fallback to OpenRouter
            this.useGroq = false;
            const apiKey = config.openrouter.apiKey;
            const baseURL = "https://openrouter.ai/api/v1";
            
            this.client = new OpenAI({
                apiKey,
                baseURL,
            });
        }
    }

    /**
     * Transcribe an audio file using Whisper API.
     * Returns the transcribed text.
     */
    async transcribe(filePath: string): Promise<string> {
        const file = fs.createReadStream(filePath);

        try {
            const model = this.useGroq ? "whisper-large-v3" : "openai/whisper-large-v3";
            const response = await this.client.audio.transcriptions.create({
                model,
                file,
                language: "en",
                prompt: "Gravity Claw assistant transcription: clear, direct, and helpful speech.",
            });

            let text = response.text.trim();
            // Filter out common Whisper hallucinations for silence/short clips
            const hallucinations = ["you", "thank you", "thanks for watching"];
            if (hallucinations.includes(text.toLowerCase().replace(/[.,!]/g, ""))) {
                return "";
            }

            return text;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`❌ Transcription error: ${errMsg}`);
            throw err;
        }
    }
}
