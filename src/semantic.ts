import { Pinecone } from "@pinecone-database/pinecone";
import type { Config } from "./config.js";
import type { LLM } from "./llm.js";

export class SemanticMemory {
    private pc: Pinecone | null = null;
    private indexName: string = "";
    private host?: string;
    private llm: LLM;
    private enabled: boolean = false;

    constructor(config: Config, llm: LLM) {
        if (config.pinecone?.apiKey) {
            this.pc = new Pinecone({ apiKey: config.pinecone.apiKey });
            this.indexName = config.pinecone.indexName;
            this.host = config.pinecone.host;
            this.enabled = true;
        }
        this.llm = llm;
    }

    /**
     * Save a turn to Pinecone archive.
     */
    async archiveTurn(userId: string, role: string, content: string): Promise<void> {
        if (!this.enabled || !this.pc) return;
        try {
            const embedding = await this.llm.embed(content);
            const index = this.pc.index(this.indexName, this.host);

            await index.upsert({
                records: [{
                    id: `${userId}-${Date.now()}`,
                    values: embedding,
                    metadata: { userId, role, content, timestamp: new Date().toISOString() }
                }]
            });
        } catch (err) {
            console.error("❌ Pinecone archival failed:", err);
        }
    }

    /**
     * Search for similar past turns.
     */
    async search(userId: string, query: string, limit: number = 3): Promise<string[]> {
        if (!this.enabled || !this.pc) return [];
        try {
            const embedding = await this.llm.embed(query);
            const index = this.pc.index(this.indexName, this.host);

            const results = await index.query({
                vector: embedding,
                topK: limit,
                filter: { userId: { "$eq": userId } },
                includeMetadata: true
            });

            return results.matches
                .filter(m => m.metadata && m.score && m.score > 0.7)
                .map(m => `[RECALL]: ${m.metadata?.content}`);
        } catch (err) {
            console.error("❌ Pinecone search failed:", err);
            return [];
        }
    }
}
