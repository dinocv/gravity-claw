import Database from "better-sqlite3";
import type { Config } from "./config.js";

export interface Memory {
    id?: number;
    user_id: string;
    content: string;
    role: "user" | "assistant";
    created_at?: string;
}

export interface Fact {
    id?: number;
    user_id: string;
    fact: string;
    category: string;
    created_at?: string;
    updated_at?: string;
}

export interface Summary {
    id?: number;
    user_id: string;
    summary: string;
    message_count: number;
    created_at?: string;
}

export class MemoryManager {
    private db: Database.Database;

    constructor(config: Config) {
        this.db = new Database(config.database.path);
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                fact TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, fact)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS message_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                message_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_message_log_user 
            ON message_log(user_id, created_at DESC)
        `);
    }

    async archiveTurn(userId: string, role: "user" | "assistant", content: string): Promise<void> {
        const stmt = this.db.prepare("INSERT INTO message_log (user_id, role, content) VALUES (?, ?, ?)");
        stmt.run(userId, role, content);
    }

    async getRecentContext(userId: string, limit: number = 20): Promise<Memory[]> {
        const stmt = this.db.prepare("SELECT * FROM message_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?");
        const rows = stmt.all(userId, limit) as any[];
        return rows.reverse().map(r => ({
            id: r.id,
            user_id: r.user_id,
            role: r.role,
            content: r.content,
            created_at: r.created_at
        }));
    }

    async getContextForTokens(userId: string, maxTokens: number = 8000): Promise<{ messages: Memory[]; summary?: string }> {
        const avgTokenPerChar = 0.25;
        const maxChars = Math.floor(maxTokens / avgTokenPerChar);

        const summary = await this.getLatestSummary(userId);
        
        const messages: Memory[] = [];
        let totalChars = summary ? summary.summary.length : 0;

        if (summary) {
            messages.push({
                user_id: userId,
                role: "assistant",
                content: `[Earlier conversation summary: ${summary.summary}]`,
            });
        }

        const allMessages = await this.getRecentContext(userId, 100);
        
        for (const msg of allMessages) {
            if (totalChars + msg.content.length > maxChars) {
                break;
            }
            messages.push(msg);
            totalChars += msg.content.length;
        }

        return { messages, summary: summary?.summary };
    }

    async rememberFact(userId: string, fact: string, category: string = "general"): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO facts (user_id, fact, category, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, fact) DO UPDATE SET 
                category = excluded.category,
                updated_at = CURRENT_TIMESTAMP
        `);
        stmt.run(userId, fact, category);
    }

    async getAllFacts(userId: string): Promise<Fact[]> {
        const stmt = this.db.prepare("SELECT * FROM facts WHERE user_id = ?");
        return stmt.all(userId) as Fact[];
    }

    async createSummary(userId: string, summaryText: string, messageCount: number): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT INTO summaries (user_id, summary, message_count) 
            VALUES (?, ?, ?)
        `);
        stmt.run(userId, summaryText, messageCount);
    }

    async getLatestSummary(userId: string): Promise<Summary | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM summaries 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        return stmt.get(userId) as Summary | undefined;
    }

    async compact(userId: string): Promise<string> {
        const messages = await this.getRecentContext(userId, 50);
        
        if (messages.length < 20) {
            return "Not enough messages to compact.";
        }

        const summaryText = this.generateBasicSummary(messages);
        const messageCount = messages.length;

        await this.createSummary(userId, summaryText, messageCount);

        const keepCount = 10;
        const toKeep = messages.slice(-keepCount);
        const toDelete = messages.slice(0, messages.length - keepCount);

        if (toDelete.length > 0) {
            const idsToDelete = toDelete.map(m => m.id).filter(id => id !== undefined);
            if (idsToDelete.length > 0) {
                const placeholders = idsToDelete.map(() => "?").join(",");
                const stmt = this.db.prepare(`DELETE FROM message_log WHERE id IN (${placeholders})`);
                stmt.run(...idsToDelete);
            }
        }

        return `Compacted ${messageCount} messages into summary. Kept ${keepCount} recent messages.`;
    }

    private generateBasicSummary(messages: Memory[]): string {
        const userMessages = messages.filter(m => m.role === "user").map(m => m.content);
        const assistantMessages = messages.filter(m => m.role === "assistant").map(m => m.content);

        const topics: string[] = [];
        const keywords = new Set<string>();
        
        const allText = [...userMessages, ...assistantMessages].join(" ").toLowerCase();
        const topicWords = ["discussed", "talked", "worked", "created", "helped", "asked", "wanted", "need", "project", "code", "file", "task"];
        
        for (const word of topicWords) {
            if (allText.includes(word)) {
                keywords.add(word);
            }
        }

        if (userMessages.length > 0) {
            const firstMsg = userMessages[0].slice(0, 50);
            const lastMsg = userMessages[userMessages.length - 1].slice(0, 50);
            topics.push(`Started with: "${firstMsg}..."`);
            topics.push(`Recent: "${lastMsg}..."`);
        }

        topics.push(`Keywords: ${Array.from(keywords).slice(0, 5).join(", ")}`);
        
        return topics.join(" | ");
    }

    async getMessageCount(userId: string): Promise<number> {
        const stmt = this.db.prepare("SELECT COUNT(*) as count FROM message_log WHERE user_id = ?");
        const result = stmt.get(userId) as { count: number };
        return result.count;
    }

    async clearHistory(userId: string): Promise<void> {
        this.db.prepare("DELETE FROM message_log WHERE user_id = ?").run(userId);
        this.db.prepare("DELETE FROM summaries WHERE user_id = ?").run(userId);
    }
}
