/**
 * YouTube Automation System
 * 
 * Based on OpenClaw's "Larry Loop" pattern:
 * - Research trending topics
 * - Generate video ideas/scripts
 * - Create videos
 * - Upload to YouTube
 * - Track analytics
 * - Iterate and improve
 */

import type { Agent } from "./agent.js";

export interface YouTubeVideo {
    id?: string;
    title: string;
    description: string;
    tags: string[];
    category: string;
    privacyStatus: "private" | "public" | "unlisted";
    script?: string;
    thumbnail?: string;
    status: "draft" | "uploading" | "processing" | "published" | "failed";
    metrics?: YouTubeMetrics;
}

export interface YouTubeMetrics {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    ctr: number;          // Click-through rate
    avgWatchTime: number;
    subscribers: number;
    revenue?: number;
    publishedAt?: string;
}

export interface VideoIdea {
    topic: string;
    title: string;
    hook: string;
    angle: string;
    targetAudience: string;
    estimatedViews: number;
    competition: "low" | "medium" | "high";
    trending: boolean;
}

export interface ContentTemplate {
    type: "tutorial" | "review" | "listicle" | "reaction" | "vlog" | "educational";
    structure: {
        intro: string;
        mainPoints: number;
        outro: string;
    };
    duration: number;      // seconds
    style: "casual" | "professional" | "energetic";
}

/**
 * YouTube Content Generator
 * 
 * Creates YouTube videos autonomously with:
 * - Topic research
 * - Script generation
 * - Thumbnail ideas
 * - SEO optimization
 */
export class YouTubeContentGenerator {
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    /**
     * Research trending topics for a niche
     */
    async researchTrends(niche: string, count: number = 10): Promise<VideoIdea[]> {
        console.log(`🔍 Researching trends for: ${niche}`);

        const prompt = `Research the top ${count} trending YouTube video ideas for the niche "${niche}".

For each idea, provide:
1. Topic - what the video is about
2. Title - catchy YouTube title (use numbers, power words)
3. Hook - attention-grabbing opening (first 10 seconds)
4. Angle - unique perspective or twist
5. TargetAudience - who is this for
6. EstimatedViews - realistic view estimate (1000-1000000)
7. Competition - low/medium/high
8. Trending - true/false if it's currently trending

Return as JSON array.`;

        const result = await this.agent.run(prompt, "youtube-research");

        try {
            // Try to extract JSON from response
            const jsonMatch = result.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse video ideas:", e);
        }

        return [];
    }

    /**
     * Generate a complete video script
     */
    async generateScript(
        topic: string,
        template: ContentTemplate,
        tone: "casual" | "professional" | "humorous" | "energetic" = "casual"
    ): Promise<{ script: string; timestamps: string[]; seoDescription: string }> {
        console.log(`📝 Generating script for: ${topic}`);

        const prompt = `Create a complete YouTube video script for: "${topic}"

Template type: ${template.type}
Duration: ~${Math.floor(template.duration / 60)} minutes
Tone: ${tone}

Include:
1. HOOK (first 10 seconds) - Attention grabber
2. INTRODUCTION (30 seconds) - Who this is for, what they'll learn
3. MAIN CONTENT - key points with timestamps
4. CONCLUSION - Summary and CTA (subscribe, like, comment)

Also provide:
- Timestamps for each section
- SEO-optimized description with timestamps
- 10-15 relevant tags
- 3-5 related video suggestions

Return as JSON with keys: script, timestamps, seoDescription, tags, relatedVideos`;

        const result = await this.agent.run(prompt, "youtube-script");

        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse script:", e);
        }

        return {
            script: result.text,
            timestamps: [],
            seoDescription: ""
        };
    }

    /**
     * Generate thumbnail ideas
     */
    async generateThumbnailIdeas(title: string, script: string): Promise<string[]> {
        console.log(`🎨 Generating thumbnail ideas`);

        const prompt = `Generate 3 thumbnail concepts for a YouTube video titled "${title}"

For each concept provide:
1. Main text to display (big, bold)
2. Background image/scene description
3. Emotion/reaction to capture
4. Color scheme
5. Text placement

Return as JSON array.`;

        const result = await this.agent.run(prompt, "youtube-thumbnail");

        try {
            const jsonMatch = result.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse thumbnail ideas:", e);
        }

        return [];
    }

    /**
     * Optimize video for SEO
     */
    async optimizeSEO(
        title: string,
        description: string,
        tags: string[]
    ): Promise<{ title: string; description: string; tags: string[] }> {
        console.log(`🔎 Optimizing SEO`);

        const prompt = `Optimize this YouTube video for maximum reach:

Current title: "${title}"
Current description: "${description}"
Current tags: ${tags.join(", ")}

Improve:
1. Title - add power words, numbers if applicable
2. Description - add timestamps, relevant keywords, CTA
3. Tags - add related tags (30+ total)
4. Category suggestion

Return as JSON with keys: title, description, tags, category`;

        const result = await this.agent.run(prompt, "youtube-seo");

        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse SEO:", e);
        }

        return { title, description, tags };
    }

    /**
     * Generate video from idea to script to uploadable
     */
    async createVideo(
        idea: VideoIdea,
        template: ContentTemplate
    ): Promise<YouTubeVideo> {
        console.log(`🎬 Creating video: ${idea.title}`);

        // Generate script
        const { script, timestamps, seoDescription } = await this.generateScript(
            idea.topic,
            template
        );

        // Generate thumbnail ideas
        const thumbnailIdeas = await this.generateThumbnailIdeas(idea.title, script);

        // Optimize SEO
        const seo = await this.optimizeSEO(
            idea.title,
            `Learn ${idea.topic} in this video!\n\n${timestamps.join("\n")}\n\n👍 Like and subscribe for more!`,
            [idea.topic, ...idea.topic.split(" ").slice(0, 5)]
        );

        return {
            title: seo.title,
            description: seo.description,
            tags: seo.tags,
            category: "28", // Science & Technology
            privacyStatus: "private",
            script,
            status: "draft"
        };
    }
}

/**
 * YouTube Analytics Tracker
 * 
 * Tracks video performance and provides insights
 */
export class YouTubeAnalytics {
    private videos: Map<string, YouTubeVideo> = new Map();
    private apiKey?: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey;
    }

    /**
     * Track a video
     */
    trackVideo(video: YouTubeVideo): void {
        this.videos.set(video.id || video.title, video);
    }

    /**
     * Get video performance
     */
    getPerformance(videoId: string): YouTubeMetrics | null {
        const video = this.videos.get(videoId);
        return video?.metrics || null;
    }

    /**
     * Get top performing videos
     */
    getTopVideos(metric: keyof YouTubeMetrics = "views", limit: number = 10): YouTubeVideo[] {
        return Array.from(this.videos.values())
            .filter(v => v.metrics)
            .sort((a, b) => (Number(b.metrics?.[metric]) || 0) - (Number(a.metrics?.[metric]) || 0))
            .slice(0, limit);
    }

    /**
     * Analyze what works
     */
    analyzeSuccess(): {
        bestTopics: string[];
        bestTitles: string[];
        avgViews: number;
        avgEngagement: number;
        recommendations: string[];
    } {
        const videos = Array.from(this.videos.values()).filter(v => v.metrics);

        if (videos.length === 0) {
            return {
                bestTopics: [],
                bestTitles: [],
                avgViews: 0,
                avgEngagement: 0,
                recommendations: ["Need more data - publish more videos!"]
            };
        }

        // Calculate averages
        const avgViews = videos.reduce((sum, v) => sum + (v.metrics?.views || 0), 0) / videos.length;
        const avgEngagement = videos.reduce((sum, v) => {
            const m = v.metrics;
            return sum + ((m?.likes || 0) + (m?.comments || 0) * 2 + (m?.shares || 0) * 3);
        }, 0) / videos.length / (avgViews || 1);

        // Find best performers
        const topVideos = videos
            .filter(v => (v.metrics?.views || 0) > avgViews)
            .slice(0, 5);

        const recommendations: string[] = [];

        if (avgEngagement < 0.05) {
            recommendations.push("Engagement is low - focus on better CTAs");
        }
        if (avgViews < 1000) {
            recommendations.push("Views are low - improve thumbnails and titles");
        }
        recommendations.push("Post consistently - frequency matters");

        return {
            bestTopics: topVideos.map(v => v.title.split(" ")[0]),
            bestTitles: topVideos.map(v => v.title),
            avgViews,
            avgEngagement: avgEngagement * 100,
            recommendations
        };
    }
}

/**
 * YouTube Posting Automation
 * 
 * Handles video upload and scheduling
 */
export class YouTubePoster {
    private contentGenerator: YouTubeContentGenerator;
    private analytics: YouTubeAnalytics;
    private agent: Agent;

    constructor(agent: Agent, youtubeApiKey?: string) {
        this.agent = agent;
        this.contentGenerator = new YouTubeContentGenerator(agent);
        this.analytics = new YouTubeAnalytics(youtubeApiKey);
    }

    /**
     * Full workflow: research → create → optimize → (simulate) upload
     */
    async createAndPost(
        niche: string,
        count: number = 5
    ): Promise<YouTubeVideo[]> {
        console.log(`\n🚀 Starting YouTube automation for: ${niche}`);

        // 1. Research trends
        const ideas = await this.contentGenerator.researchTrends(niche, count);

        // 2. Create videos from ideas
        const videos: YouTubeVideo[] = [];

        for (const idea of ideas) {
            // Select template based on idea
            const template = this.selectTemplate(idea);

            // Generate full video
            const video = await this.contentGenerator.createVideo(idea, template);

            videos.push(video);
            this.analytics.trackVideo(video);
        }

        console.log(`✅ Created ${videos.length} video drafts`);

        return videos;
    }

    /**
     * Select best template based on idea
     */
    private selectTemplate(idea: VideoIdea): ContentTemplate {
        // Check if trending = use listicle for quick views
        if (idea.trending) {
            return {
                type: "listicle",
                structure: { intro: "Hook", mainPoints: 10, outro: "CTA" },
                duration: 600,
                style: "energetic"
            };
        }

        // Low competition = educational deep dive
        if (idea.competition === "low") {
            return {
                type: "educational",
                structure: { intro: "Intro", mainPoints: 5, outro: "Summary" },
                duration: 900,
                style: "professional"
            };
        }

        // Default to tutorial
        return {
            type: "tutorial",
            structure: { intro: "Hook", mainPoints: 7, outro: "CTA" },
            duration: 720,
            style: "casual"
        };
    }

    /**
     * Get analytics insights
     */
    getInsights() {
        return this.analytics.analyzeSuccess();
    }
}

// Factory function
export function createYouTubeAutomation(agent: Agent, apiKey?: string): YouTubePoster {
    return new YouTubePoster(agent, apiKey);
}
