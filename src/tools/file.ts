import fs from "node:fs";
import path from "node:path";
import type { Config } from "../config.js";

const MAX_FILE_SIZE = 1024 * 1024;
const ALLOWED_EXTENSIONS = [".ts", ".js", ".json", ".md", ".txt", ".yaml", ".yml", ".toml", ".env", ".html", ".css", ".py", ".rs", ".go"];

export class FileManager {
    private allowedPaths: string[] = [];
    private baseDir: string;

    constructor(config: Config, baseDir?: string) {
        this.baseDir = baseDir || process.cwd();
        this.allowedPaths = config.security?.allowedPaths || [this.baseDir];
    }

    isPathAllowed(filePath: string): boolean {
        const resolved = path.resolve(this.baseDir, filePath);
        
        for (const allowed of this.allowedPaths) {
            const allowedResolved = path.resolve(this.baseDir, allowed);
            if (resolved.startsWith(allowedResolved)) {
                return true;
            }
        }
        return false;
    }

    async readFile(filePath: string): Promise<string> {
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`Access denied: ${filePath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, filePath);
        
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(fullPath);
        if (stats.size > MAX_FILE_SIZE) {
            throw new Error(`File too large: ${filePath} (max ${MAX_FILE_SIZE} bytes)`);
        }

        return fs.readFileSync(fullPath, "utf-8");
    }

    async writeFile(filePath: string, content: string): Promise<string> {
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`Access denied: ${filePath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, filePath);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, "utf-8");
        return `File written: ${filePath}`;
    }

    async deleteFile(filePath: string): Promise<string> {
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`Access denied: ${filePath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, filePath);
        
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        fs.unlinkSync(fullPath);
        return `File deleted: ${filePath}`;
    }

    async listFiles(dirPath: string = ".", recursive: boolean = false): Promise<string[]> {
        if (!this.isPathAllowed(dirPath)) {
            throw new Error(`Access denied: ${dirPath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, dirPath);
        
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const results: string[] = [];
        
        if (recursive) {
            this.walkDir(fullPath, results);
        } else {
            const entries = fs.readdirSync(fullPath);
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry);
                const stats = fs.statSync(path.resolve(this.baseDir, entryPath));
                results.push(`${entry} ${stats.isDirectory() ? "[DIR]" : "[FILE]"}`);
            }
        }

        return results;
    }

    private walkDir(dir: string, results: string[]): void {
        const entries = fs.readdirSync(dir);
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const relativePath = path.relative(this.baseDir, fullPath);
            
            if (entry.startsWith(".")) continue;
            
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                this.walkDir(fullPath, results);
            } else {
                const ext = path.extname(entry);
                if (ALLOWED_EXTENSIONS.includes(ext) || ext === "") {
                    results.push(relativePath);
                }
            }
        }
    }

    async searchFiles(query: string, dirPath: string = "."): Promise<string[]> {
        if (!this.isPathAllowed(dirPath)) {
            throw new Error(`Access denied: ${dirPath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, dirPath);
        const results: string[] = [];
        const queryLower = query.toLowerCase();

        this.searchDir(fullPath, queryLower, results);

        return results.slice(0, 50);
    }

    private searchDir(dir: string, query: string, results: string[]): void {
        if (results.length >= 50) return;

        const entries = fs.readdirSync(dir);
        
        for (const entry of entries) {
            if (results.length >= 50) break;
            if (entry.startsWith(".")) continue;
            if (entry === "node_modules") continue;

            const fullPath = path.join(dir, entry);
            const relativePath = path.relative(this.baseDir, fullPath);
            
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                this.searchDir(fullPath, query, results);
            } else {
                const ext = path.extname(entry);
                if (ALLOWED_EXTENSIONS.includes(ext) || ext === "") {
                    if (entry.toLowerCase().includes(query)) {
                        results.push(relativePath);
                    }
                }
            }
        }
    }

    async createDirectory(dirPath: string): Promise<string> {
        if (!this.isPathAllowed(dirPath)) {
            throw new Error(`Access denied: ${dirPath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, dirPath);
        
        if (fs.existsSync(fullPath)) {
            throw new Error(`Directory already exists: ${dirPath}`);
        }

        fs.mkdirSync(fullPath, { recursive: true });
        return `Directory created: ${dirPath}`;
    }

    async fileInfo(filePath: string): Promise<string> {
        if (!this.isPathAllowed(filePath)) {
            throw new Error(`Access denied: ${filePath} is not in allowed paths`);
        }

        const fullPath = path.resolve(this.baseDir, filePath);
        
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(fullPath);
        
        return JSON.stringify({
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
        }, null, 2);
    }
}

export const fileOperationsToolDef = {
    type: "function" as const,
    function: {
        name: "file_operations",
        description: "Read, write, delete, list, or search files in the allowed directories. Use for code inspection, creating files, or finding specific files.",
        parameters: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["read", "write", "delete", "list", "search", "mkdir", "info"],
                    description: "The file operation to perform"
                },
                path: {
                    type: "string",
                    description: "File or directory path (relative to project root)"
                },
                content: {
                    type: "string",
                    description: "Content to write (required for write operation)"
                },
                recursive: {
                    type: "boolean",
                    description: "For list operation: recursively list subdirectories"
                },
                query: {
                    type: "string",
                    description: "For search operation: filename or text to search for"
                }
            },
            required: ["operation", "path"]
        }
    }
};

export async function handleFileOperation(fileManager: FileManager, args: any): Promise<string> {
    const { operation, path: filePath, content, recursive, query } = args;

    try {
        switch (operation) {
            case "read":
                return await fileManager.readFile(filePath);
            case "write":
                if (!content) {
                    throw new Error("Content is required for write operation");
                }
                return await fileManager.writeFile(filePath, content);
            case "delete":
                return await fileManager.deleteFile(filePath);
            case "list":
                return (await fileManager.listFiles(filePath, recursive)).join("\n");
            case "search":
                if (!query) {
                    throw new Error("Query is required for search operation");
                }
                return (await fileManager.searchFiles(query, filePath)).join("\n");
            case "mkdir":
                return await fileManager.createDirectory(filePath);
            case "info":
                return await fileManager.fileInfo(filePath);
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return `Error: ${errMsg}`;
    }
}
