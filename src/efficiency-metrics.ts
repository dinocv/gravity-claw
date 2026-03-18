/**
 * Efficiency Metrics System
 * 
 * Based on OpenJarvis's efficiency-aware evaluation:
 * https://scalingintelligence.stanford.edu/blogs/openjarvis/
 * 
 * Tracks:
 * - Latency (response time)
 * - Token usage (prompt + completion)
 * - Cost (estimated API costs)
 * - Energy (when available)
 */

export interface MetricPoint {
    timestamp: number;
    value: number;
    labels?: Record<string, string>;
}

export interface RequestMetrics {
    requestId: string;
    model: string;
    provider: string;

    // Timing
    startTime: number;
    endTime: number;
    latencyMs: number;

    // Tokens
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;

    // Cost (estimated in USD)
    promptCost: number;
    completionCost: number;
    totalCost: number;

    // Request info
    success: boolean;
    error?: string;
    toolCalls?: number;
    iterations?: number;
}

export interface EfficiencyStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;

    // Latency stats (ms)
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;

    // Token stats
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    avgTokensPerRequest: number;

    // Cost stats (USD)
    totalCost: number;
    avgCostPerRequest: number;
    costPerHour: number;

    // Throughput
    requestsPerMinute: number;
    tokensPerSecond: number;
}

/**
 * Cost per 1M tokens for different models (USD)
 * These are approximate prices
 */
const MODEL_COSTS: Record<string, { prompt: number; completion: number }> = {
    // Anthropic
    "claude-3-5-sonnet": { prompt: 3.0, completion: 15.0 },
    "claude-3-opus": { prompt: 15.0, completion: 75.0 },
    "claude-3-haiku": { prompt: 0.25, completion: 1.25 },

    // OpenAI
    "gpt-4o": { prompt: 2.5, completion: 10.0 },
    "gpt-4-turbo": { prompt: 10.0, completion: 30.0 },
    "gpt-3.5-turbo": { prompt: 0.5, completion: 1.5 },

    // Google
    "gemini-1.5-pro": { prompt: 1.25, completion: 5.0 },
    "gemini-1.5-flash": { prompt: 0.075, completion: 0.3 },

    // DeepSeek
    "deepseek-chat": { prompt: 0.14, completion: 0.28 },

    // OpenRouter (varies by provider)
    "openrouter/anthropic/claude-3.5-sonnet": { prompt: 3.0, completion: 15.0 },
    "openrouter/google/gemini-pro": { prompt: 1.25, completion: 5.0 },

    // Ollama (local - no API cost)
    "ollama/*": { prompt: 0, completion: 0 },
};

/**
 * Get cost for a model
 */
export function getModelCost(model: string): { prompt: number; completion: number } {
    // Try exact match first
    if (MODEL_COSTS[model]) {
        return MODEL_COSTS[model];
    }

    // Try partial match
    for (const [key, cost] of Object.entries(MODEL_COSTS)) {
        if (model.includes(key.replace("*", ""))) {
            return cost;
        }
    }

    // Default estimate
    return { prompt: 1.0, completion: 5.0 };
}

/**
 * Calculate cost for a request
 */
export function calculateRequestCost(
    model: string,
    promptTokens: number,
    completionTokens: number
): { promptCost: number; completionCost: number; totalCost: number } {
    const cost = getModelCost(model);

    const promptCost = (promptTokens / 1_000_000) * cost.prompt;
    const completionCost = (completionTokens / 1_000_000) * cost.completion;
    const totalCost = promptCost + completionCost;

    return { promptCost, completionCost, totalCost };
}

export class EfficiencyMetrics {
    private metrics: RequestMetrics[] = [];
    private maxHistory: number = 10000;
    private sessionStartTime: number = Date.now();

    /**
     * Record a request's metrics
     */
    recordRequest(metrics: RequestMetrics): void {
        this.metrics.push(metrics);

        // Trim history if needed
        if (this.metrics.length > this.maxHistory) {
            this.metrics = this.metrics.slice(-this.maxHistory);
        }
    }

    /**
     * Get statistics for a time window
     */
    getStats(windowMs?: number): EfficiencyStats {
        let filteredMetrics = this.metrics;

        // Filter by time window
        if (windowMs) {
            const cutoff = Date.now() - windowMs;
            filteredMetrics = this.metrics.filter(m => m.startTime >= cutoff);
        }

        if (filteredMetrics.length === 0) {
            return this.getEmptyStats();
        }

        const successful = filteredMetrics.filter(m => m.success);
        const failed = filteredMetrics.filter(m => !m.success);

        // Calculate latency stats
        const latencies = filteredMetrics.map(m => m.latencyMs).sort((a, b) => a - b);

        // Calculate token stats
        const totalPromptTokens = filteredMetrics.reduce((sum, m) => sum + m.promptTokens, 0);
        const totalCompletionTokens = filteredMetrics.reduce((sum, m) => sum + m.completionTokens, 0);
        const totalTokens = filteredMetrics.reduce((sum, m) => sum + m.totalTokens, 0);

        // Calculate cost stats
        const totalCost = filteredMetrics.reduce((sum, m) => sum + m.totalCost, 0);

        // Calculate time span
        const firstRequest = filteredMetrics[0]?.startTime || Date.now();
        const lastRequest = filteredMetrics[filteredMetrics.length - 1]?.endTime || Date.now();
        const timeSpanMinutes = (lastRequest - firstRequest) / 60000 || 1;

        return {
            totalRequests: filteredMetrics.length,
            successfulRequests: successful.length,
            failedRequests: failed.length,
            successRate: filteredMetrics.length > 0
                ? (successful.length / filteredMetrics.length) * 100
                : 0,

            avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            minLatencyMs: latencies[0],
            maxLatencyMs: latencies[latencies.length - 1],
            p50LatencyMs: this.percentile(latencies, 50),
            p95LatencyMs: this.percentile(latencies, 95),
            p99LatencyMs: this.percentile(latencies, 99),

            totalPromptTokens,
            totalCompletionTokens,
            totalTokens,
            avgTokensPerRequest: totalTokens / filteredMetrics.length,

            totalCost,
            avgCostPerRequest: totalCost / filteredMetrics.length,
            costPerHour: (totalCost / timeSpanMinutes) * 60,

            requestsPerMinute: filteredMetrics.length / timeSpanMinutes,
            tokensPerSecond: totalTokens / (timeSpanMinutes * 60)
        };
    }

    /**
     * Get stats for current session
     */
    getSessionStats(): EfficiencyStats {
        return this.getStats();
    }

    /**
     * Get stats for last hour
     */
    getHourlyStats(): EfficiencyStats {
        return this.getStats(60 * 60 * 1000);
    }

    /**
     * Get stats for last day
     */
    getDailyStats(): EfficiencyStats {
        return this.getStats(24 * 60 * 60 * 1000);
    }

    /**
     * Get recent requests
     */
    getRecentRequests(count: number = 10): RequestMetrics[] {
        return this.metrics.slice(-count).reverse();
    }

    /**
     * Get metrics for a specific model
     */
    getModelStats(model: string): EfficiencyStats {
        const filteredMetrics = this.metrics.filter(m => m.model === model);
        const tempMetrics = this.metrics;
        this.metrics = filteredMetrics;
        const stats = this.getStats();
        this.metrics = tempMetrics;
        return stats;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        this.sessionStartTime = Date.now();
    }

    /**
     * Export metrics as JSON
     */
    exportJSON(): string {
        return JSON.stringify({
            sessionStartTime: this.sessionStartTime,
            totalRequests: this.metrics.length,
            stats: this.getSessionStats(),
            requests: this.metrics
        }, null, 2);
    }

    /**
     * Calculate percentile
     */
    private percentile(sortedArray: number[], p: number): number {
        const index = Math.ceil((p / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }

    /**
     * Get empty stats
     */
    private getEmptyStats(): EfficiencyStats {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            successRate: 0,
            avgLatencyMs: 0,
            minLatencyMs: 0,
            maxLatencyMs: 0,
            p50LatencyMs: 0,
            p95LatencyMs: 0,
            p99LatencyMs: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTokens: 0,
            avgTokensPerRequest: 0,
            totalCost: 0,
            avgCostPerRequest: 0,
            costPerHour: 0,
            requestsPerMinute: 0,
            tokensPerSecond: 0
        };
    }
}

// Singleton instance
export const efficiencyMetrics = new EfficiencyMetrics();

/**
 * Decorator to measure function execution time
 */
export function measureTime<T extends (...args: any[]) => any>(
    fn: T,
    labels?: Record<string, string>
): T {
    return ((...args: any[]) => {
        const start = Date.now();
        const result = fn(...args);

        // If result is a promise, measure async
        if (result && typeof result.then === 'function') {
            return result.finally(() => {
                const latency = Date.now() - start;
                console.log(`⏱️ ${fn.name} took ${latency}ms`);
            });
        }

        const latency = Date.now() - start;
        console.log(`⏱️ ${fn.name} took ${latency}ms`);
        return result;
    }) as T;
}
