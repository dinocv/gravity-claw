import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export class TTS {
    private apiKey: string;
    private voiceId: string = "nPczCjzI2devNBz1zQrb";
    private baseUrl: string = "https://api.elevenlabs.io/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Generates speech from text using ElevenLabs API.
     * Returns the path to the temporary audio file.
     */
    async generateSpeech(text: string): Promise<string> {
        const url = `${this.baseUrl}/text-to-speech/${this.voiceId}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": this.apiKey,
                },
                body: JSON.stringify({
                    text: text.slice(0, 2500),
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ ElevenLabs Error [${response.status}]: ${errorText}`);
                throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const tmpFile = path.join(os.tmpdir(), `gc_tts_${Date.now()}.mp3`);
            fs.writeFileSync(tmpFile, buffer);

            console.log(`✅ TTS generated: ${tmpFile}`);
            return tmpFile;
        } catch (err) {
            console.error(`❌ TTS generation failed:`, err);
            throw err;
        }
    }
}
