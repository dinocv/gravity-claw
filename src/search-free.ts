import type { SearchResult } from "./tools/search.js";

/**
 * Jina AI Search - Free unlimited web search and content extraction
 * API: https://jina.ai/reader
 * No API key required for basic usage
 */
export class JinaSearch {
    private apiKey?: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey;
    }

    /**
     * Search the web using Jina AI (free tier: 10,000 requests/month)
     */
    async search(query: string, numResults: number = 10): Promise<SearchResult[]> {
        try {
            // Use Jina's search endpoint
            const url = `https://s.jina.ai/http://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

            const response = await fetch(url);
            const data = await response.json() as any;

            if (!data.results || data.results.length === 0) {
                // Fallback to direct content extraction
                return this.duckDuckGoFallback(query, numResults);
            }

            return data.results.slice(0, numResults).map((item: any) => ({
                title: item.title || "",
                url: item.url || "",
                snippet: item.description || item.content || "",
                source: "Jina AI",
            }));
        } catch (err) {
            console.error("❌ Jina search failed:", err);
            return this.duckDuckGoFallback(query, numResults);
        }
    }

    /**
     * Extract content from a URL using Jina Reader
     * Free, no API key needed
     */
    async extractContent(url: string): Promise<string> {
        try {
            const readerUrl = `https://jina.ai/reader/${url}`;
            const response = await fetch(readerUrl);

            if (!response.ok) {
                throw new Error(`Jina Reader failed: ${response.status}`);
            }

            const data = await response.json() as any;
            return data.content || data.text || "";
        } catch (err) {
            console.error("❌ Jina content extraction failed:", err);
            throw err;
        }
    }

    /**
     * Summarize a URL using Jina AI
     */
    async summarize(url: string): Promise<string> {
        try {
            const summarizeUrl = `https://jina.ai/summarize/${url}`;
            const response = await fetch(summarizeUrl);

            if (!response.ok) {
                throw new Error(`Jina summarize failed: ${response.status}`);
            }

            const data = await response.json() as any;
            return data.summary || "";
        } catch (err) {
            console.error("❌ Jina summarize failed:", err);
            throw err;
        }
    }

    /**
     * DuckDuckGo fallback (always free)
     */
    private async duckDuckGoFallback(query: string, numResults: number): Promise<SearchResult[]> {
        try {
            const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
            const response = await fetch(url);
            const data = await response.json() as any;

            return (data.RelatedTopics || []).slice(0, numResults).map((item: any) => ({
                title: item.Text || "",
                url: item.FirstURL || "",
                snippet: item.Text || "",
                source: "DuckDuckGo",
            }));
        } catch (err) {
            console.error("❌ DuckDuckGo fallback failed:", err);
            return [];
        }
    }

    /**
     * Search and format results
     */
    async searchAndFormat(query: string, numResults: number = 10): Promise<string> {
        const results = await this.search(query, numResults);

        if (results.length === 0) {
            return "No search results found.";
        }

        const formatted = results.map((r, i) =>
            `${i + 1}. **${r.title}**\n   ${r.snippet}\n   🔗 ${r.url}`
        ).join("\n\n");

        return `🔍 Search results for "${query}":\n\n${formatted}`;
    }
}

/**
 * Create Jina Search instance
 */
export function createJinaSearch(): JinaSearch {
    return new JinaSearch(process.env.JINA_API_KEY);
}
