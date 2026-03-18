import type { Config } from "../config.js";

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
}

export class WebSearch {
    private apiKey?: string;
    private provider: "google" | "bing" | "duckduckgo" | "serpapi" | "tavily";

    constructor(config: Config) {
        // Default to DuckDuckGo (free, unlimited)
        this.provider = (config.search?.provider as any) || "duckduckgo";

        if (this.provider === "google" && config.google?.apiKey) {
            this.apiKey = config.google.apiKey;
        } else if (config.search?.apiKey) {
            this.apiKey = config.search.apiKey;
        } else if (config.tavily?.apiKey) {
            this.apiKey = config.tavily.apiKey;
            this.provider = "tavily";
        } else if (config.firecrawl?.apiKey) {
            this.provider = "tavily"; // Fallback to tavily if firecrawl available
        }
    }

    async search(query: string, numResults: number = 10): Promise<SearchResult[]> {
        switch (this.provider) {
            case "tavily":
                return this.tavilySearch(query, numResults);
            case "google":
                return this.googleSearch(query, numResults);
            case "bing":
                return this.bingSearch(query, numResults);
            case "duckduckgo":
            default:
                return this.duckDuckGoSearch(query, numResults);
        }
    }

    private async tavilySearch(query: string, numResults: number): Promise<SearchResult[]> {
        if (!this.apiKey) {
            return this.duckDuckGoSearch(query, numResults);
        }

        const url = "https://api.tavily.com/search";

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    query,
                    max_results: numResults,
                    include_answer: true,
                    include_raw_content: false,
                    include_images: false,
                }),
            });
            const data = await response.json() as any;

            if (data.answer) {
                return [{
                    title: "AI Summary",
                    url: "",
                    snippet: data.answer,
                    source: "Tavily AI",
                }];
            }

            return (data.results || []).map((item: any) => ({
                title: item.title,
                url: item.url,
                snippet: item.content,
                source: "Tavily",
            }));
        } catch (err) {
            console.error("Tavily search error:", err);
            return this.duckDuckGoSearch(query, numResults);
        }
    }

    private async googleSearch(query: string, numResults: number): Promise<SearchResult[]> {
        if (!this.apiKey) {
            return this.duckDuckGoSearch(query, numResults);
        }

        const url = `https://customsearch.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${process.env.GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=${numResults}`;

        try {
            const response = await fetch(url);
            const data = await response.json() as any;

            return (data.items || []).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                source: "Google",
            }));
        } catch (err) {
            console.error("Google search error:", err);
            return [];
        }
    }

    private async bingSearch(query: string, numResults: number): Promise<SearchResult[]> {
        if (!this.apiKey) {
            return this.duckDuckGoSearch(query, numResults);
        }

        const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${numResults}`;

        try {
            const response = await fetch(url, {
                headers: { "Ocp-Apim-Subscription-Key": this.apiKey },
            });
            const data = await response.json();

            return (data.webPages?.value || []).map((item: any) => ({
                title: item.name,
                url: item.url,
                snippet: item.snippet,
                source: "Bing",
            }));
        } catch (err) {
            console.error("Bing search error:", err);
            return [];
        }
    }

    private async duckDuckGoSearch(query: string, numResults: number): Promise<SearchResult[]> {
        const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

        try {
            const response = await fetch(url);
            const data = await response.json() as any;

            return (data.RelatedTopics || []).slice(0, numResults).map((item: any) => ({
                title: item.Text || item.Title,
                url: item.FirstURL || item.url,
                snippet: item.Text || "",
                source: "DuckDuckGo",
            }));
        } catch (err) {
            console.error("DuckDuckGo search error:", err);
            return [];
        }
    }

    private async serpApiSearch(query: string, numResults: number): Promise<SearchResult[]> {
        if (!this.apiKey) {
            return this.duckDuckGoSearch(query, numResults);
        }

        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${this.apiKey}&num=${numResults}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            return (data.organic_results || []).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                source: "SerpAPI",
            }));
        } catch (err) {
            console.error("SerpAPI search error:", err);
            return this.duckDuckGoSearch(query, numResults);
        }
    }

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

export const webSearchToolDef = {
    type: "function" as const,
    function: {
        name: "web_search",
        description: "Search the web for information. Use this when you need current information, facts, news, or to verify information.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query"
                },
                numResults: {
                    type: "number",
                    description: "Number of results to return (default 10)"
                }
            },
            required: ["query"]
        }
    }
};
