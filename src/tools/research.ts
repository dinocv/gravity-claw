import type { Config } from "../config.js";

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
}

export class DeepResearch {
    private apiKey?: string;
    private provider: "google" | "bing" | "duckduckgo" | "serpapi" | "tavily";
    private firecrawlApiKey?: string;

    constructor(config: Config) {
        this.provider = (config.search?.provider as any) || "tavily";
        
        if (this.provider === "google" && config.google?.apiKey) {
            this.apiKey = config.google.apiKey;
        } else if (config.search?.apiKey) {
            this.apiKey = config.search.apiKey;
        } else if (config.tavily?.apiKey) {
            this.apiKey = config.tavily.apiKey;
            this.provider = "tavily";
        }
        
        if (config.firecrawl?.apiKey) {
            this.firecrawlApiKey = config.firecrawl.apiKey;
        }
    }

    async scrape(url: string): Promise<string> {
        if (!this.firecrawlApiKey) {
            return "Firecrawl API key not configured";
        }

        try {
            const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.firecrawlApiKey}`,
                },
                body: JSON.stringify({
                    url,
                    formats: ["markdown", "text"],
                }),
            });
            
            const data = await response.json() as any;
            
            if (data.success && data.data) {
                return data.data.markdown || data.data.text || "No content extracted";
            }
            
            return `Scraping failed: ${data.error || "Unknown error"}`;
        } catch (err) {
            console.error("Firecrawl scrape error:", err);
            return `Scraping error: ${err}`;
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
                return this.duckDuckGoSearch(query, numResults);
            default:
                return this.tavilySearch(query, numResults);
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

    async deepResearch(topic: string, depth: "quick" | "deep" | "comprehensive" = "deep"): Promise<string> {
        console.log(`🔍 Starting ${depth} research on: ${topic}`);
        
        const queries = this.generateResearchQueries(topic, depth);
        const allResults: SearchResult[] = [];
        
        for (const query of queries) {
            const results = await this.search(query, 8);
            allResults.push(...results);
            console.log(`   📊 Found ${results.length} results for: ${query}`);
        }

        const uniqueResults = this.deduplicateResults(allResults);
        
        return this.formatResearchReport(topic, uniqueResults, depth);
    }

    private generateResearchQueries(topic: string, depth: string): string[] {
        const baseQueries = [
            topic,
            `${topic} explained`,
            `how ${topic} works`,
            `${topic} best practices`,
        ];

        if (depth === "deep" || depth === "comprehensive") {
            baseQueries.push(
                `${topic} tutorial`,
                `${topic} vs alternatives`,
                `${topic} pros and cons`,
            );
        }

        if (depth === "comprehensive") {
            baseQueries.push(
                `${topic} latest news`,
                `${topic} 2024 2025`,
                `${topic} beginner guide`,
                `${topic} advanced techniques`,
            );
        }

        return baseQueries;
    }

    private deduplicateResults(results: SearchResult[]): SearchResult[] {
        const seen = new Set<string>();
        return results.filter(r => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        });
    }

    private formatResearchReport(topic: string, results: SearchResult[], depth: string): string {
        const header = depth === "comprehensive" 
            ? `📚 COMPREHENSIVE RESEARCH: ${topic}`
            : depth === "deep"
            ? `🔬 DEEP RESEARCH: ${topic}`
            : `🔍 QUICK RESEARCH: ${topic}`;

        const sources = results.slice(0, depth === "comprehensive" ? 20 : 10).map((r, i) => 
            `${i + 1}. **${r.title}**\n   ${r.snippet}\n   🔗 ${r.url}`
        ).join("\n\n");

        return `${header}\n\n📊 *${results.length} sources found*\n\n${sources}`;
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

export const deepResearchToolDef = {
    type: "function" as const,
    function: {
        name: "deep_research",
        description: "Perform deep research on any topic. This tool searches multiple sources, deduplicates results, and generates a comprehensive research report. Use for: learning new topics, fact-checking, understanding concepts, finding best practices, or any question requiring thorough investigation.",
        parameters: {
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "The topic to research thoroughly"
                },
                depth: {
                    type: "string",
                    enum: ["quick", "deep", "comprehensive"],
                    description: "Research depth: quick (3 queries), deep (5 queries), comprehensive (10 queries)"
                }
            },
            required: ["topic"]
        }
    }
};

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

export const scrapeToolDef = {
    type: "function" as const,
    function: {
        name: "scrape_url",
        description: "Scrape content from a specific URL. Use this when you need detailed information from a particular webpage, article, or documentation.",
        parameters: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The URL to scrape content from"
                }
            },
            required: ["url"]
        }
    }
};
