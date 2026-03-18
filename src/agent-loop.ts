/**
 * Agent Loop System
 * 
 * Based on OpenClaw's "Larry Loop" pattern:
 * https://youtu.be/OV5eK91YY68
 * 
 * A feedback-driven loop where:
 * 1. Agent performs a task
 * 2. Collects feedback/metrics
 * 3. Analyzes results
 * 4. Iterates and improves
 * 
 * This enables autonomous improvement over time.
 */

import type { Agent } from "./agent.js";

export interface LoopMetric {
    id: string;
    timestamp: number;
    taskType: string;
    input: string;
    output: string;
    feedback: MetricFeedback;
    iteration: number;
    success: boolean;
}

export interface MetricFeedback {
    score?: number;          // 0-100 quality score
    engagement?: number;      // views, clicks, etc.
    conversion?: number;     // actions taken
    errors?: string[];
    latency?: number;        // execution time
    cost?: number;           // API cost
    userFeedback?: string;    // human feedback
    platformMetrics?: {
        views?: number;
        likes?: number;
        shares?: number;
        comments?: number;
        conversion?: number;
    };
}

export interface LoopConfig {
    maxIterations: number;
    minScore: number;           // Minimum score to consider successful
    improveOnFailure: boolean;
    collectMetrics: boolean;
    autoOptimize: boolean;
}

export type LoopPhase =
    | "planning"     // Analyzing the task
    | "executing"    // Performing the task
    | "collecting"   // Gathering feedback
    | "analyzing"    // Evaluating results
    | "iterating"    // Improving based on feedback
    | "completed"    // Task complete
    | "failed";      // Task failed

/**
 * Agent Loop - A feedback-driven iteration system
 * 
 * Enables agents to:
 * - Execute tasks with feedback collection
 * - Analyze performance metrics
 * - Auto-iterate to improve results
 * - Learn from past executions
 */
export class AgentLoop {
    private agent: Agent;
    private config: LoopConfig;
    private currentPhase: LoopPhase = "planning";
    private currentIteration: number = 0;
    private metrics: LoopMetric[] = [];
    private pendingFeedback: MetricFeedback | null = null;

    constructor(
        agent: Agent,
        config: Partial<LoopConfig> = {}
    ) {
        this.agent = agent;
        this.config = {
            maxIterations: config.maxIterations || 5,
            minScore: config.minScore || 70,
            improveOnFailure: config.improveOnFailure ?? true,
            collectMetrics: config.collectMetrics ?? true,
            autoOptimize: config.autoOptimize ?? false
        };
    }

    /**
     * Execute a task with the feedback loop
     */
    async execute(
        task: string,
        context?: Record<string, any>
    ): Promise<{ result: string; metrics: LoopMetric }> {
        console.log(`🔄 Starting Agent Loop for: "${task.slice(0, 50)}..."`);

        let bestResult = "";
        let bestScore = 0;
        let finalMetric: LoopMetric | null = null;

        for (let i = 0; i < this.config.maxIterations; i++) {
            this.currentIteration = i + 1;
            this.currentPhase = "executing";

            console.log(`\n📍 Iteration ${this.currentIteration}/${this.config.maxIterations}`);
            console.log(`   Phase: ${this.currentPhase}`);

            // Execute the task
            const startTime = Date.now();
            const result = await this.agent.run(task, "agent-loop");
            const executionTime = Date.now() - startTime;

            // Collect any pending feedback
            const feedback = await this.collectFeedback(executionTime);

            // Store metric
            const metric: LoopMetric = {
                id: `metric_${Date.now()}_${i}`,
                timestamp: Date.now(),
                taskType: this.detectTaskType(task),
                input: task,
                output: result.text,
                feedback,
                iteration: this.currentIteration,
                success: feedback.score ? feedback.score >= this.config.minScore : true
            };

            this.metrics.push(metric);
            finalMetric = metric;

            // Check if result is good enough
            const score = feedback.score || this.calculateImplicitScore(feedback);

            if (score >= this.config.minScore) {
                console.log(`   ✅ Score: ${score} (>= ${this.config.minScore})`);
                bestResult = result.text;
                bestScore = score;
                this.currentPhase = "completed";
                break;
            }

            // Analyze and prepare for iteration
            this.currentPhase = "analyzing";
            console.log(`   📊 Score: ${score} (< ${this.config.minScore})`);
            console.log(`   Phase: ${this.currentPhase}`);

            if (this.currentIteration < this.config.maxIterations) {
                this.currentPhase = "iterating";
                console.log(`   🔄 Preparing iteration ${this.currentIteration + 1}`);

                // Update task with feedback for next iteration
                task = this.enhanceTask(task, feedback, result.text);
            }

            bestResult = result.text;
            bestScore = score;
        }

        if (this.currentPhase !== "completed") {
            this.currentPhase = "failed";
        }

        console.log(`\n🏁 Loop complete. Phase: ${this.currentPhase}`);
        console.log(`   Best score: ${bestScore}`);

        return {
            result: bestResult,
            metrics: finalMetric!
        };
    }

    /**
     * Provide feedback for the current execution
     */
    provideFeedback(feedback: MetricFeedback): void {
        this.pendingFeedback = feedback;
    }

    /**
     * Collect feedback from various sources
     */
    private async collectFeedback(executionTime: number): Promise<MetricFeedback> {
        const feedback: MetricFeedback = {
            latency: executionTime
        };

        // Use pending feedback if available
        if (this.pendingFeedback) {
            Object.assign(feedback, this.pendingFeedback);
            this.pendingFeedback = null;
        }

        // Calculate implicit score based on available metrics
        if (!feedback.score) {
            feedback.score = this.calculateImplicitScore(feedback);
        }

        return feedback;
    }

    /**
     * Calculate an implicit quality score from available metrics
     */
    private calculateImplicitScore(feedback: MetricFeedback): number {
        let score = 50; // Base score

        // Penalize for errors
        if (feedback.errors && feedback.errors.length > 0) {
            score -= feedback.errors.length * 10;
        }

        // Penalize for high latency
        if (feedback.latency) {
            if (feedback.latency > 30000) score -= 20;
            else if (feedback.latency > 10000) score -= 10;
            else if (feedback.latency < 5000) score += 10;
        }

        // Penalize for high cost
        if (feedback.cost) {
            if (feedback.cost > 1.0) score -= 15;
            else if (feedback.cost < 0.1) score += 10;
        }

        // Boost for positive engagement
        if (feedback.platformMetrics) {
            const { views, likes, shares, comments } = feedback.platformMetrics;
            if (views && views > 1000) score += 10;
            if (likes && shares && shares > 0) score += (shares * 5);
            if (comments && comments > 10) score += 15;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Enhance task based on feedback for next iteration
     */
    private enhanceTask(
        originalTask: string,
        feedback: MetricFeedback,
        previousOutput: string
    ): string {
        const improvements: string[] = [];

        // Analyze what went wrong
        if (feedback.errors && feedback.errors.length > 0) {
            improvements.push(`FIX ERRORS: ${feedback.errors.join(", ")}`);
        }

        // Check engagement metrics
        if (feedback.platformMetrics) {
            const { views, conversion } = feedback.platformMetrics;

            if (views !== undefined && views < 100) {
                improvements.push("IMPROVE: The content isn't getting views. Focus on better hooks and titles.");
            }

            if (conversion !== undefined && conversion === 0 && views && views > 100) {
                improvements.push("IMPROVE: Views but no conversions. Improve CTAs and call-to-action.");
            }
        }

        // Check latency issues
        if (feedback.latency && feedback.latency > 20000) {
            improvements.push("OPTIMIZE: Response was too slow. Be more concise.");
        }

        // Build enhanced task
        const enhancedTask = `${originalTask}

PREVIOUS OUTPUT:
${previousOutput}

FEEDBACK ANALYSIS:
${improvements.length > 0 ? improvements.join("\n") : "No specific issues identified"}

Please improve the output based on this feedback.`;

        return enhancedTask;
    }

    /**
     * Detect the type of task
     */
    private detectTaskType(task: string): string {
        const lower = task.toLowerCase();

        if (lower.includes("tiktok") || lower.includes("video") || lower.includes("slideshow")) {
            return "content_creation";
        }
        if (lower.includes("write") || lower.includes("blog") || lower.includes("article")) {
            return "writing";
        }
        if (lower.includes("code") || lower.includes("program") || lower.includes("bug")) {
            return "coding";
        }
        if (lower.includes("research") || lower.includes("find") || lower.includes("analyze")) {
            return "research";
        }
        if (lower.includes("market") || lower.includes("seo") || lower.includes("ads")) {
            return "marketing";
        }

        return "general";
    }

    /**
     * Get loop statistics
     */
    getStats(): {
        totalExecutions: number;
        successRate: number;
        avgScore: number;
        avgIterations: number;
        byType: Record<string, { count: number; avgScore: number }>;
    } {
        const typeMap = new Map<string, { count: number; totalScore: number }>();

        for (const metric of this.metrics) {
            const existing = typeMap.get(metric.taskType) || { count: 0, totalScore: 0 };
            existing.count++;
            existing.totalScore += metric.feedback.score || 50;
            typeMap.set(metric.taskType, existing);
        }

        const byType: Record<string, { count: number; avgScore: number }> = {};
        for (const [type, data] of typeMap) {
            byType[type] = {
                count: data.count,
                avgScore: data.totalScore / data.count
            };
        }

        const scores = this.metrics.map(m => m.feedback.score || 50);

        return {
            totalExecutions: this.metrics.length,
            successRate: this.metrics.filter(m => m.success).length / this.metrics.length * 100,
            avgScore: scores.reduce((a, b) => a + b, 0) / scores.length || 0,
            avgIterations: this.metrics.reduce((a, m) => a + m.iteration, 0) / this.metrics.length || 0,
            byType
        };
    }

    /**
     * Get recent metrics
     */
    getRecentMetrics(count: number = 10): LoopMetric[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get metrics by task type
     */
    getMetricsByType(taskType: string): LoopMetric[] {
        return this.metrics.filter(m => m.taskType === taskType);
    }

    /**
     * Get best performing outputs
     */
    getBestOutputs(taskType?: string, limit: number = 5): LoopMetric[] {
        let filtered = taskType ? this.metrics.filter(m => m.taskType === taskType) : this.metrics;

        return filtered
            .sort((a, b) => (b.feedback.score || 0) - (a.feedback.score || 0))
            .slice(0, limit);
    }

    /**
     * Clear metrics
     */
    clearMetrics(): void {
        this.metrics = [];
    }

    /**
     * Get current phase
     */
    getPhase(): LoopPhase {
        return this.currentPhase;
    }

    /**
     * Get current iteration
     */
    getIteration(): number {
        return this.currentIteration;
    }
}

/**
 * Marketing Agent Loop - Specialized for content creation
 * 
 * Based on Larry (OpenClaw's marketing agent):
 * - Creates content (TikTok, social media)
 * - Reads analytics
 * - Iterates on hooks and CTAs
 * - Feeds performance back into creation
 */
export class MarketingAgentLoop extends AgentLoop {
    /**
     * Execute content creation with platform optimization
     */
    async createContent(
        contentType: "tiktok" | "instagram" | "twitter" | "blog",
        topic: string,
        platformMetrics?: MetricFeedback["platformMetrics"]
    ): Promise<{ content: string; optimized: boolean }> {

        // Build platform-specific prompt
        const basePrompt = this.buildContentPrompt(contentType, topic);

        // Provide platform metrics if available
        if (platformMetrics) {
            this.provideFeedback({ platformMetrics });
        }

        // Execute with loop
        const { result, metrics } = await this.execute(basePrompt);

        // Check if we need to iterate for improvement
        const needsIteration =
            !metrics.success ||
            (platformMetrics && (!platformMetrics.views || platformMetrics.views < 1000));

        return {
            content: result,
            optimized: metrics.success
        };
    }

    /**
     * Build content prompt based on platform
     */
    private buildContentPrompt(contentType: string, topic: string): string {
        const prompts: Record<string, string> = {
            tiktok: `Create a viral TikTok slideshow script about: ${topic}
            
            Include:
            - Attention-grabbing hook (first 3 seconds)
            - Value proposition
            - Call-to-action (CTA)
            
            Format: 8-10 slides, each with image description and text`,

            instagram: `Create an Instagram carousel post about: ${topic}
            
            Include:
            - Hook slide
            - 5-7 value slides
            - CTA slide
            
            Format: Image descriptions with caption text`,

            twitter: `Create a Twitter thread about: ${topic}
            
            Include:
            - Hook tweet
            - 5-7 value tweets
            - CTA tweet
            
            Format: Individual tweet text`,

            blog: `Write a blog article about: ${topic}
            
            Include:
            - Attention-grabbing introduction
            - 3-5 main points
            - Conclusion with CTA
            
            Format: Full article with headers`
        };

        return prompts[contentType] || `Create content about: ${topic}`;
    }

    /**
     * Analyze and optimize hooks
     */
    async optimizeHook(
        originalHook: string,
        performanceData?: { views: number; ctr: number }
    ): Promise<string> {
        const feedback: MetricFeedback = {};

        if (performanceData) {
            if (performanceData.views < 100) {
                feedback.errors = ["Hook not engaging enough"];
            }
            if (performanceData.ctr < 0.02) {
                feedback.errors = (feedback.errors || []).concat(["CTA weak"]);
            }
        }

        this.provideFeedback(feedback);

        const { result } = await this.execute(
            `Improve this hook: "${originalHook}"
            
            Make it more attention-grabbing and click-worthy.
            
            Keep it under 10 words.`
        );

        return result;
    }
}

// Default instance factory
export function createAgentLoop(agent: Agent, config?: Partial<LoopConfig>): AgentLoop {
    return new AgentLoop(agent, config);
}

export function createMarketingLoop(agent: Agent, config?: Partial<LoopConfig>): MarketingAgentLoop {
    return new MarketingAgentLoop(agent, {
        maxIterations: config?.maxIterations || 3,
        minScore: config?.minScore || 75,
        ...config
    });
}
