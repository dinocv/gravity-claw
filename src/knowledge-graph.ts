import Database from "better-sqlite3";
import type { Config } from "./config.js";

export interface Entity {
    id?: number;
    name: string;
    type: string;
    properties: string;
    created_at?: string;
}

export interface Relationship {
    id?: number;
    from_entity: number;
    to_entity: number;
    relationship_type: string;
    properties?: string;
    created_at?: string;
}

export class KnowledgeGraph {
    private db: Database.Database;

    constructor(config: Config) {
        this.db = new Database(config.database.path);
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS kg_entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'entity',
                properties TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, type)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS kg_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_entity INTEGER NOT NULL,
                to_entity INTEGER NOT NULL,
                relationship_type TEXT NOT NULL,
                properties TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_entity) REFERENCES kg_entities(id),
                FOREIGN KEY (to_entity) REFERENCES kg_entities(id)
            )
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_entities_name ON kg_entities(name)
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_entities_type ON kg_entities(type)
        `);
    }

    async addEntity(name: string, type: string = "entity", properties: Record<string, any> = {}): Promise<number> {
        const stmt = this.db.prepare(`
            INSERT INTO kg_entities (name, type, properties) 
            VALUES (?, ?, ?)
            ON CONFLICT(name, type) DO UPDATE SET
                properties = excluded.properties
        `);
        
        const result = stmt.run(name, type, JSON.stringify(properties));
        return result.lastInsertRowid as number;
    }

    async getEntity(name: string, type?: string): Promise<Entity | undefined> {
        let stmt;
        if (type) {
            stmt = this.db.prepare("SELECT * FROM kg_entities WHERE name = ? AND type = ?");
            return stmt.get(name, type) as Entity | undefined;
        } else {
            stmt = this.db.prepare("SELECT * FROM kg_entities WHERE name = ?");
            return stmt.get(name) as Entity | undefined;
        }
    }

    async searchEntities(query: string, type?: string): Promise<Entity[]> {
        let stmt;
        if (type) {
            stmt = this.db.prepare("SELECT * FROM kg_entities WHERE name LIKE ? AND type = ?");
            return stmt.all(`%${query}%`, type) as Entity[];
        } else {
            stmt = this.db.prepare("SELECT * FROM kg_entities WHERE name LIKE ?");
            return stmt.all(`%${query}%`) as Entity[];
        }
    }

    async addRelationship(
        fromName: string,
        toName: string,
        relationshipType: string,
        fromType: string = "entity",
        toType: string = "entity",
        properties: Record<string, any> = {}
    ): Promise<number> {
        const fromEntity = await this.addEntity(fromName, fromType);
        const toEntity = await this.addEntity(toName, toType);

        const stmt = this.db.prepare(`
            INSERT INTO kg_relationships (from_entity, to_entity, relationship_type, properties)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(fromEntity, toEntity, relationshipType, JSON.stringify(properties));
        return result.lastInsertRowid as number;
    }

    async getRelationships(entityName: string): Promise<any[]> {
        const entity = await this.getEntity(entityName);
        if (!entity || !entity.id) return [];

        const stmt = this.db.prepare(`
            SELECT r.*, 
                   e_from.name as from_name, e_from.type as from_type,
                   e_to.name as to_name, e_to.type as to_type
            FROM kg_relationships r
            JOIN kg_entities e_from ON r.from_entity = e_from.id
            JOIN kg_entities e_to ON r.to_entity = e_to.id
            WHERE r.from_entity = ? OR r.to_entity = ?
        `);

        return stmt.all(entity.id, entity.id);
    }

    async getEntityGraph(entityName: string, depth: number = 2): Promise<any> {
        const entity = await this.getEntity(entityName);
        if (!entity) return null;

        const graph: any = {
            entity: entity,
            relationships: [],
            connected: []
        };

        const visited = new Set<number>();
        const queue: { id: number; depth: number }[] = [{ id: entity.id!, depth: 0 }];

        while (queue.length > 0) {
            const current = queue.shift()!;
            
            if (visited.has(current.id) || current.depth > depth) continue;
            visited.add(current.id);

            const rels = this.db.prepare(`
                SELECT r.*, 
                       e_from.name as from_name, e_from.type as from_type,
                       e_to.name as to_name, e_to.type as to_type
                FROM kg_relationships r
                JOIN kg_entities e_from ON r.from_entity = e_from.id
                JOIN kg_entities e_to ON r.to_entity = e_to.id
                WHERE r.from_entity = ? OR r.to_entity = ?
            `).all(current.id, current.id);

            for (const rel of rels as any[]) {
                graph.relationships.push(rel);
                
                const connectedId = rel.from_entity === current.id ? rel.to_entity : rel.from_entity;
                if (!visited.has(connectedId)) {
                    const connectedEntity = this.db.prepare("SELECT * FROM kg_entities WHERE id = ?").get(connectedId);
                    if (connectedEntity) {
                        graph.connected.push(connectedEntity);
                        queue.push({ id: connectedId, depth: current.depth + 1 });
                    }
                }
            }
        }

        return graph;
    }

    async deleteEntity(name: string, type?: string): Promise<boolean> {
        const entity = await this.getEntity(name, type);
        if (!entity || !entity.id) return false;

        this.db.prepare("DELETE FROM kg_relationships WHERE from_entity = ? OR to_entity = ?").run(entity.id, entity.id);
        this.db.prepare("DELETE FROM kg_entities WHERE id = ?").run(entity.id);
        
        return true;
    }

    async getAllTypes(): Promise<string[]> {
        const results = this.db.prepare("SELECT DISTINCT type FROM kg_entities").all() as { type: string }[];
        return results.map(r => r.type);
    }

    async getStats(): Promise<{ entities: number; relationships: number; types: number }> {
        const entityCount = (this.db.prepare("SELECT COUNT(*) as count FROM kg_entities").get() as any).count;
        const relCount = (this.db.prepare("SELECT COUNT(*) as count FROM kg_relationships").get() as any).count;
        const types = await this.getAllTypes();

        return {
            entities: entityCount,
            relationships: relCount,
            types: types.length
        };
    }

    async extractFromText(text: string): Promise<{ entities: string[]; relationships: [string, string, string][] }> {
        const entities: string[] = [];
        const relationships: [string, string, string][] = [];
        
        const patterns = {
            entity: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
            relation: /(\w+)\s+(?:is|are|was|were|has|have|had|owns?|created?|likes?|hates?|knows?|works? with?)\s+(\w+)/gi,
        };

        let match;
        while ((match = patterns.entity.exec(text)) !== null) {
            if (!entities.includes(match[1])) {
                entities.push(match[1]);
            }
        }

        while ((match = patterns.relation.exec(text)) !== null) {
            if (entities.includes(match[1]) && entities.includes(match[2])) {
                relationships.push([match[1], match[3], match[2]]);
            }
        }

        return { entities, relationships };
    }

    async autoBuildFromText(userId: string, text: string): Promise<string> {
        const { entities, relationships } = await this.extractFromText(text);

        if (entities.length === 0) {
            return "No entities found in text.";
        }

        for (const entity of entities) {
            await this.addEntity(entity, "auto");
        }

        for (const [from, type, to] of relationships) {
            await this.addRelationship(from, to, type);
        }

        return `Added ${entities.length} entities and ${relationships.length} relationships to knowledge graph.`;
    }
}
