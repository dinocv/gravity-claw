/**
 * Comfy Video Generator
 * 
 * Creates 8+ hour "comfy" videos for YouTube automation:
 * - Lofi hip hop + anime visuals
 * - Rain/soundscapes
 * - Study with me
 * - Minecraft/retro game loops
 * - Fireplace/campfire
 * - Cat/dog loops
 */

import type { Agent } from "./agent.js";

export interface ComfyVideoConfig {
    duration: number;        // hours (typically 8)
    type: ComfyVideoType;
    mood: "chill" | "study" | "sleep" | "focus" | "relax";
    visuals: VisualStyle;
    audio: AudioStyle;
    title: string;
    tags: string[];
    description: string;
    category: string;
}

export type ComfyVideoType =
    | "lofi"
    | "rain"
    | "study"
    | "gaming"
    | "fireplace"
    | "nature"
    | "anime"
    | "mixed";

export type VisualStyle =
    | "anime"
    | "pixel"
    | "nature"
    | "minimal"
    | "retro"
    | "abstract";

export type AudioStyle =
    | "lofi"
    | "ambient"
    | "rain"
    | "jazz"
    | "classical"
    | "white_noise"
    | "mixed";

export interface ComfyTemplate {
    type: ComfyVideoType;
    name: string;
    duration: number;  // hours
    visualPrompt: string;
    audioPrompt: string;
    titlePatterns: string[];
    tagPatterns: string[];
    descriptionTemplate: string;
}

/**
 * Pre-made templates for comfy videos
 */
export const COMFY_TEMPLATES: ComfyTemplate[] = [
    {
        type: "lofi",
        name: "Lofi Hip Hop",
        duration: 8,
        visualPrompt: "Anime cityscape at night, lofi aesthetic, cozy room with window, rain droplets, vintage aesthetic, warm colors",
        audioPrompt: "Lofi hip hop beats, chillhop, relaxing lofi with soft piano and drums, study music, no vocals",
        titlePatterns: [
            "lofi hip hop radio - beats to relax/study to",
            "chill lofi - late night vibes",
            "lofi hip hop - cozy rainy night",
            "relaxing lofi - beats to sleep/work to"
        ],
        tagPatterns: ["lofi", "lofi hip hop", "chill", "study", "relax", "music", "beats", "sleep", "rain"],
        descriptionTemplate: `🎧 Lofi Hip Hop Radio - {duration} hours of relaxing beats

Perfect for:
• Studying 📚
• Working 💻  
• Relaxing 😌
• Sleeping 💤
• Gaming 🎮

🔔 Turn on notifications for more cozy vibes!

#lofi #hiphop #chill #study #relax #music #beats #lofiradio #chillhop`
    },
    {
        type: "rain",
        name: "Rain Sounds",
        duration: 8,
        visualPrompt: "Peaceful rain on window, raindrops falling, cozy indoor view, soft lighting, autumn vibes",
        audioPrompt: "Rain sounds, gentle rainfall, thunderstorm in distance, white noise, relaxing rain for sleep and focus",
        titlePatterns: [
            "rain sounds for sleeping - 8 hours",
            "peaceful rain - relax and sleep",
            "heavy rain on window - 8 hours",
            "rain and thunder - relaxing sleep"
        ],
        tagPatterns: ["rain", "rain sounds", "sleep", "relax", "nature", "white noise", "ambient", "focus"],
        descriptionTemplate: `🌧️ Rain Sounds - {duration} hours of peaceful rainfall

Perfect for:
• Sleep 💤
• Focus while working 🎯
• Relaxation 🧘
• Meditation 🕯️
• Studying 📖

🔔 Subscribe for more relaxation content!

#rain #rainsounds #sleep #relax #focus #ambient #nature #whitenoise`
    },
    {
        type: "study",
        name: "Study With Me",
        duration: 8,
        visualPrompt: "Cozy study desk setup, aesthetic workspace, books, laptop, warm lamp, minimal desk setup, pomodoro timer visible",
        audioPrompt: "Soft lofi in background, occasional clock ticking, typing sounds, gentle ambient, white noise",
        titlePatterns: [
            "study with me - 8 hours - aesthetic",
            "productive study session - with breaks",
            "study with me - no talk - lofi",
            "deep work session - aesthetic"
        ],
        tagPatterns: ["studywithme", "study", "productivity", "lofi", "aesthetic", "desk setup", "focus", "motivation"],
        descriptionTemplate: `📚 Study With Me - {duration} hours of productive studying

🌸 What's in this video:
• Aesthetic desk setup view
• Lofi hip hop beats
• Pomodoro timer (25/5)
• Cozy vibes only

📝 Use this for:
• Studying for exams
• Working from home
• Deep focus sessions
• Background while gaming

🔔 Don't forget to subscribe!

#studywithme #study #productivity #lofi #aesthetic #deskSetup #focus #motivation`
    },
    {
        type: "fireplace",
        name: "Fireplace",
        duration: 8,
        visualPrompt: "Cozy fireplace with crackling fire, warm flames, wooden cabin interior, winter vibes, candlelight",
        audioPrompt: "Crackling fireplace sounds, occasional wood popping, warm ambient, cozy fireplace for sleep",
        titlePatterns: [
            "crackling fireplace - 8 hours - cozy fire",
            "fireplace sounds for sleep - relaxing",
            "warm fireplace - ambient fireplace",
            "cozy cabin fire - relaxing"
        ],
        tagPatterns: ["fireplace", "cozy", "fire", "sleep", "relax", "ambient", "winter", "cabin"],
        descriptionTemplate: `🔥 Cozy Fireplace - {duration} hours of warm crackling fire

Perfect for:
• Sleep 💤
• Relaxation 🛋️
• Background while working
• Cozy vibes only ❄️

🔔 Turn on for more cozy content!

#fireplace #cozy #relax #sleep #ambient #winter #cabin #vibes`
    },
    {
        type: "nature",
        name: "Nature Sounds",
        duration: 8,
        visualPrompt: "Beautiful nature scenery, forest, river stream, birds, peaceful landscape, sunrise, nature relaxation",
        audioPrompt: "Bird songs, river flowing, gentle wind, forest ambience, nature sounds for relaxation and sleep",
        titlePatterns: [
            "nature sounds - forest stream - 8 hours",
            "birds and river - relaxing nature",
            "peaceful forest - ambient sounds",
            "nature relaxation - soundscape"
        ],
        tagPatterns: ["nature", "birds", "forest", "stream", "relax", "sleep", "ambient", "soundscape"],
        descriptionTemplate: `🌲 Nature Sounds - {duration} hours of peaceful nature

Features:
• Bird songs 🐦
• River stream 🌊
• Gentle wind 🍃
• Forest ambience 🌳

Perfect for:
• Sleep 💤
• Meditation 🧘
• Focus 🎯
• Relaxation 🧸

🔔 Subscribe for more nature vibes!

#nature #birds #forest #relax #sleep #ambient #soundscape #natureSounds`
    },
    {
        type: "anime",
        name: "Anime Loops",
        duration: 8,
        visualPrompt: "Anime aesthetic scenes, cozy anime room, anime city at night, anime characters studying, relaxing anime loops",
        audioPrompt: "Soft lofi, gentle piano, relaxing anime OST, calm background music",
        titlePatterns: [
            "anime aesthetic lofi - 8 hours",
            "cozy anime vibes - relax/study",
            "anime study with me - aesthetic",
            "lofi anime beats - chill vibes"
        ],
        tagPatterns: ["anime", "lofi", "aesthetic", "anime aesthetic", "chill", "study", "relax", "vibes"],
        descriptionTemplate: `🎌 Anime Aesthetic Lofi - {duration} hours of cozy vibes

✨ Beautiful anime scenes with relaxing lofi

Perfect for:
• Studying 📚
• Drawing 🎨
• Relaxing 😌
• Background while creating 💫

🔔 Subscribe for more anime lofi!

#anime #lofi #aesthetic #chill #study #relax #vibes #animeaesthetic`
    }
];

/**
 * Comfy Video Generator
 * 
 * Creates long-form comfy videos automatically
 */
export class ComfyVideoGenerator {
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    /**
     * Generate a complete comfy video configuration
     */
    async generateVideo(config: Partial<ComfyVideoConfig>): Promise<ComfyVideoConfig> {
        console.log(`🎬 Generating comfy video: ${config.type || "random"}`);

        // Get template
        const template = this.getTemplate(config.type);

        // Generate title
        const title = this.generateTitle(template, config.mood);

        // Generate description
        const description = this.generateDescription(template, config);

        // Generate tags
        const tags = this.generateTags(template, config);

        return {
            duration: config.duration || template.duration,
            type: config.type || template.type,
            mood: config.mood || "relax",
            visuals: config.visuals || "anime",
            audio: config.audio || "lofi",
            title,
            tags,
            description,
            category: "24" // Entertainment
        };
    }

    /**
     * Generate multiple videos in batch
     */
    async generateBatch(
        count: number,
        types?: ComfyVideoType[]
    ): Promise<ComfyVideoConfig[]> {
        const videos: ComfyVideoConfig[] = [];

        for (let i = 0; i < count; i++) {
            // Rotate through types or pick random
            const type = types
                ? types[i % types.length]
                : COMFY_TEMPLATES[Math.floor(Math.random() * COMFY_TEMPLATES.length)].type;

            const video = await this.generateVideo({ type });
            videos.push(video);
        }

        return videos;
    }

    /**
     * Get template for video type
     */
    private getTemplate(type?: ComfyVideoType): ComfyTemplate {
        if (type) {
            const found = COMFY_TEMPLATES.find(t => t.type === type);
            if (found) return found;
        }

        // Random template
        return COMFY_TEMPLATES[Math.floor(Math.random() * COMFY_TEMPLATES.length)];
    }

    /**
     * Generate catchy title
     */
    private generateTitle(template: ComfyTemplate, mood?: string): string {
        const patterns = template.titlePatterns;
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        const hour = template.duration;

        return pattern
            .replace("{duration}", `${hour} hours`)
            .replace("{mood}", mood || "chill");
    }

    /**
     * Generate SEO description
     */
    private generateDescription(template: ComfyTemplate, config: Partial<ComfyVideoConfig>): string {
        const template_str = template.descriptionTemplate;

        return template_str.replace("{duration}", `${config.duration || template.duration}`);
    }

    /**
     * Generate tags
     */
    private generateTags(template: ComfyTemplate, config: Partial<ComfyVideoConfig>): string[] {
        const tags = [...template.tagPatterns];

        // Add mood tags
        if (config.mood) {
            tags.push(config.mood);
        }

        // Add duration tags
        tags.push(`${config.duration || 8}hours`);
        tags.push(`${config.duration || 8}h`);

        // Add some generic tags
        tags.push("longversion");
        tags.push("full version");

        // Remove duplicates and limit to 30
        return [...new Set(tags)].slice(0, 30);
    }

    /**
     * Get available templates
     */
    listTemplates(): ComfyTemplate[] {
        return COMFY_TEMPLATES;
    }
}

/**
 * YouTube Upload Simulation
 * 
 * Note: Real uploads need YouTube Data API
 */
export class ComfyVideoUploader {
    private videos: ComfyVideoConfig[] = [];

    /**
     * Queue video for upload
     */
    queue(video: ComfyVideoConfig): void {
        this.videos.push(video);
        console.log(`📝 Queued: ${video.title}`);
    }

    /**
     * Get queued videos
     */
    getQueue(): ComfyVideoConfig[] {
        return this.videos;
    }

    /**
     * Clear queue
     */
    clear(): void {
        this.videos = [];
    }

    /**
     * Real YouTube Upload using Data API v3
     * Note: Requires OAuth2 for video uploads, API key alone won't work
     * This checks if we have the credentials and uploads if possible
     */
    async uploadToYouTube(video: ComfyVideoConfig): Promise<{
        success: boolean;
        videoId?: string;
        message: string;
    }> {
        const config = await import("../src/config.js");
        const cfg = config.loadConfig();

        // Check for OAuth credentials (needed for actual upload)
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
        const apiKey = process.env.YOUTUBE_API_KEY;

        console.log(`\n📤 Attempting YouTube upload...`);
        console.log(`   Title: ${video.title}`);
        console.log(`   Duration: ${video.duration} hours`);
        console.log(`   Has API Key: ${!!apiKey}`);
        console.log(`   Has OAuth: ${!!clientId && !!clientSecret}`);

        if (!clientId || !clientSecret) {
            return {
                success: false,
                message: "OAuth2 credentials needed for uploads. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env"
            };
        }

        // TODO: Implement actual OAuth2 upload flow
        // This would require:
        // 1. OAuth2 token exchange
        // 2. multipart upload to YouTube Data API
        // 3. Setting video status (public/private)

        return {
            success: false,
            message: "Upload not implemented yet - need to set up OAuth2 flow"
        };
    }

    /**
     * Simulate upload (for testing)
     */
    async simulateUpload(video: ComfyVideoConfig): Promise<{
        success: boolean;
        videoId: string;
        message: string;
    }> {
        console.log(`\n📤 Would upload to YouTube:`);
        console.log(`   Title: ${video.title}`);
        console.log(`   Duration: ${video.duration} hours`);
        console.log(`   Type: ${video.type}`);
        console.log(`   Tags: ${video.tags.slice(0, 5).join(", ")}...`);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            videoId: `sim_${Date.now()}`,
            message: "Video configured! Connect YouTube API to actually upload."
        };
    }
}

// Factory function
export function createComfyVideoGenerator(agent: Agent): ComfyVideoGenerator {
    return new ComfyVideoGenerator(agent);
}

export function createComfyVideoUploader(): ComfyVideoUploader {
    return new ComfyVideoUploader();
}
