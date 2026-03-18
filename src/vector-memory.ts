import { createClient } from "@supabase/supabase-js";
import type { Config } from "./config.js";

export interface MemoryVector {
    id: number;
    text: string;
    label?: string;
    category?: string;
    source?: string;
    embedding?: number[];
    metadata?: Record<string, any>;
    created_at?: string;
}

export class VectorMemory {
    private supabase: ReturnType<typeof createClient> | null = null;
    private enabled: boolean = false;

    constructor(config: Config) {
        if (config.supabase.url && config.supabase.anonKey) {
            this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
            this.enabled = true;
            console.log("✅ Vector Memory initialized (Supabase)");
        } else {
            console.log("⚠️ Vector Memory disabled - no Supabase credentials");
        }
    }

    getSetupSQL(): string {
        return `-- Run this in Supabase SQL Editor to enable vector memory:
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_vectors (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    label TEXT,
    category TEXT DEFAULT 'general',
    source TEXT DEFAULT 'conversation',
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_vectors_embedding 
ON memory_vectors USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_memory_vectors_category 
ON memory_vectors (category);

-- Vector search function
CREATE OR REPLACE FUNCTION match_memory_vectors(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id bigint,
    text text,
    label text,
    category text,
    source text,
    metadata jsonb,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mv.id,
        mv.text,
        mv.label,
        mv.category,
        mv.source,
        mv.metadata,
        mv.created_at,
        1 - (mv.embedding <=> query_embedding) AS similarity
    FROM memory_vectors mv
    WHERE mv.embedding IS NOT NULL
    AND 1 - (mv.embedding <=> query_embedding) > match_threshold
    ORDER BY mv.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
`;
    }

    async initialize(): Promise<void> {
        console.log("📦 To enable vector memory, run this in Supabase SQL Editor:");
        console.log(this.getSetupSQL());
    }

    async store(memory: Omit<MemoryVector, "id" | "created_at">): Promise<number | null> {
        if (!this.supabase || !memory.embedding) return null;

        try {
            const { data, error } = await this.supabase
                .from("memory_vectors" as any)
                .insert({
                    text: memory.text,
                    label: memory.label || null,
                    category: memory.category || "general",
                    source: memory.source || "conversation",
                    metadata: memory.metadata || {},
                    embedding: memory.embedding,
                } as any)
                .select("id")
                .single() as any;

            if (error) throw error;
            return data?.id || null;
        } catch (err) {
            console.error("❌ Vector store failed:", err);
            return null;
        }
    }

    async search(queryEmbedding: number[], limit: number = 5, minScore: number = 0.3): Promise<any[]> {
        if (!this.supabase) return [];

        try {
            const { data, error } = await this.supabase.rpc("match_memory_vectors", {
                query_embedding: queryEmbedding,
                match_threshold: minScore,
                match_count: limit,
            } as any);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("❌ Vector search failed:", err);
            return [];
        }
    }

    async deleteByCategory(category: string): Promise<number> {
        if (!this.supabase) return 0;

        try {
            const { count, error } = await this.supabase
                .from("memory_vectors" as any)
                .delete({ count: "exact" })
                .eq("category", category);

            if (error) throw error;
            return count || 0;
        } catch (err) {
            console.error("❌ Vector delete failed:", err);
            return 0;
        }
    }

    async getStats(): Promise<{ total: number; categories: Record<string, number> }> {
        if (!this.supabase) return { total: 0, categories: {} };

        try {
            const { count } = await this.supabase
                .from("memory_vectors" as any)
                .select("*", { count: "exact", head: true });

            return { total: count || 0, categories: {} };
        } catch (err) {
            return { total: 0, categories: {} };
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}
