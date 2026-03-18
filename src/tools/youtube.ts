/**
 * YouTube Tools for Agent
 * 
 * Provides tools for:
 * - Generating comfy videos
 * - Managing video queue
 * - Checking channel stats
 * - Creating upload configurations
 */

import type { Agent } from "../agent.js";
import { ComfyVideoGenerator, createComfyVideoUploader } from "../comfy-videos.js";
import { createYouTubeAutomation } from "../youtube-automation.js";

/**
 * Register YouTube tools with the agent
 */
export function registerYouTubeTools(agent: Agent): void {
    const generator = new ComfyVideoGenerator(agent);
    const uploader = createComfyVideoUploader();

    // Tool: Generate comfy video config
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "generate_comfy_video",
                description: "Generate a comfy video configuration for YouTube (8+ hour relaxing video). Perfect for lofi, rain sounds, study with me, fireplace, nature videos.",
                parameters: {
                    type: "object",
                    properties: {
                        video_type: {
                            type: "string",
                            enum: ["lofi", "rain", "study", "fireplace", "nature", "anime", "random"],
                            description: "Type of comfy video to generate"
                        },
                        duration_hours: {
                            type: "number",
                            description: "Duration in hours (default 8)"
                        },
                        mood: {
                            type: "string",
                            enum: ["chill", "study", "sleep", "focus", "relax"],
                            description: "Mood of the video"
                        }
                    }
                }
            }
        },
        async (args: any) => {
            try {
                const video = await generator.generateVideo({
                    type: args.video_type as any || "random",
                    duration: args.duration_hours || 8,
                    mood: args.mood || "relax"
                });

                // Queue for upload
                uploader.queue(video);

                return JSON.stringify({
                    success: true,
                    title: video.title,
                    description: video.description.slice(0, 200) + "...",
                    tags: video.tags,
                    queued: uploader.getQueue().length,
                    visual_prompt: video.visuals,
                    audio_prompt: video.audio,
                    message: "Video config generated and queued!"
                }, null, 2);
            } catch (e: any) {
                return JSON.stringify({ success: false, error: e.message });
            }
        }
    );

    // Tool: Generate batch of videos
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "generate_comfy_batch",
                description: "Generate multiple comfy videos at once for your YouTube channel.",
                parameters: {
                    type: "object",
                    properties: {
                        count: {
                            type: "number",
                            description: "Number of videos to generate (1-10)"
                        },
                        types: {
                            type: "string",
                            description: "Comma-separated video types: lofi,rain,study,fireplace,nature,anime"
                        }
                    }
                }
            }
        },
        async (args: any) => {
            try {
                const count = Math.min(10, Math.max(1, args.count || 3));
                const types = args.types
                    ? args.types.split(",").map((t: string) => t.trim()) as any[]
                    : undefined;

                const videos = await generator.generateBatch(count, types);

                // Queue all videos
                videos.forEach(v => uploader.queue(v));

                return JSON.stringify({
                    success: true,
                    generated: count,
                    queued: uploader.getQueue().length,
                    videos: videos.map(v => ({
                        title: v.title,
                        type: v.type,
                        duration: v.duration
                    })),
                    message: `Generated ${count} video configs! Ready to upload.`
                }, null, 2);
            } catch (e: any) {
                return JSON.stringify({ success: false, error: e.message });
            }
        }
    );

    // Tool: Get video queue
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "get_video_queue",
                description: "Get the current queue of videos ready for upload."
            }
        },
        async () => {
            const queue = uploader.getQueue();
            return JSON.stringify({
                count: queue.length,
                videos: queue.map((v, i) => ({
                    index: i + 1,
                    title: v.title,
                    type: v.type,
                    duration: v.duration
                }))
            }, null, 2);
        }
    );

    // Tool: Clear video queue
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "clear_video_queue",
                description: "Clear all videos from the upload queue."
            }
        },
        async () => {
            uploader.clear();
            return JSON.stringify({
                success: true,
                message: "Video queue cleared!"
            });
        }
    );

    // Tool: List available templates
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "list_video_templates",
                description: "List all available comfy video templates."
            }
        },
        async () => {
            const templates = generator.listTemplates();
            return JSON.stringify({
                templates: templates.map(t => ({
                    type: t.type,
                    name: t.name,
                    duration: t.duration,
                    example_titles: t.titlePatterns.slice(0, 2)
                }))
            }, null, 2);
        }
    );

    // Tool: Simulate upload (for testing)
    agent.registerTool(
        {
            type: "function",
            function: {
                name: "simulate_upload",
                description: "Simulate uploading a video (for testing without real API)."
            }
        },
        async () => {
            const queue = uploader.getQueue();
            if (queue.length === 0) {
                return JSON.stringify({
                    success: false,
                    message: "No videos in queue. Generate some first!"
                });
            }

            const video = queue[0];
            const result = await uploader.simulateUpload(video);

            return JSON.stringify({
                success: result.success,
                video_id: result.videoId,
                title: video.title,
                message: result.message
            }, null, 2);
        }
    );

    console.log("📺 YouTube tools registered!");
}

/**
 * Get the uploader instance (for external access)
 */
export function getVideoUploader() {
    return createComfyVideoUploader();
}
