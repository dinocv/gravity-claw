import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;

export class SecretManager {
    private masterKey: Buffer | null = null;
    private secrets: Map<string, string> = new Map();

    constructor(masterKey?: string) {
        if (masterKey) {
            this.masterKey = this.deriveKey(masterKey);
        }
    }

    private deriveKey(password: string): Buffer {
        const salt = crypto.scryptSync(password, "gravity-claw-salt", KEY_LENGTH);
        return salt;
    }

    setMasterKey(key: string): void {
        this.masterKey = this.deriveKey(key);
    }

    encrypt(plaintext: string): string {
        if (!this.masterKey) {
            throw new Error("Master key not set");
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

        let encrypted = cipher.update(plaintext, "utf8", "hex");
        encrypted += cipher.final("hex");

        const authTag = cipher.getAuthTag();

        return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
    }

    decrypt(ciphertext: string): string {
        if (!this.masterKey) {
            throw new Error("Master key not set");
        }

        const parts = ciphertext.split(":");
        if (parts.length !== 3) {
            throw new Error("Invalid ciphertext format");
        }

        const iv = Buffer.from(parts[0], "hex");
        const authTag = Buffer.from(parts[1], "hex");
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    }

    store(key: string, value: string, encrypt: boolean = true): void {
        const storedValue = encrypt ? this.encrypt(value) : value;
        this.secrets.set(key, storedValue);
    }

    retrieve(key: string, decrypt: boolean = true): string | null {
        const stored = this.secrets.get(key);
        if (!stored) return null;

        return decrypt ? this.decrypt(stored) : stored;
    }

    delete(key: string): boolean {
        return this.secrets.delete(key);
    }

    has(key: string): boolean {
        return this.secrets.has(key);
    }

    list(): string[] {
        return Array.from(this.secrets.keys());
    }

    encryptFile(inputPath: string, outputPath: string): void {
        const fs = require("node:fs");
        const plaintext = fs.readFileSync(inputPath, "utf-8");
        const encrypted = this.encrypt(plaintext);
        fs.writeFileSync(outputPath, encrypted, "utf-8");
    }

    decryptFile(inputPath: string, outputPath: string): void {
        const fs = require("node:fs");
        const encrypted = fs.readFileSync(inputPath, "utf-8");
        const decrypted = this.decrypt(encrypted);
        fs.writeFileSync(outputPath, decrypted, "utf-8");
    }

    getEnvWithPrefix(prefix: string = "SECRET_"): Record<string, string> {
        const result: Record<string, string> = {};
        
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith(prefix) && value) {
                try {
                    const decrypted = this.decrypt(value);
                    result[key.replace(prefix, "")] = decrypted;
                } catch {
                    result[key.replace(prefix, "")] = value;
                }
            }
        }

        return result;
    }
}

export const secretToolsDef = {
    type: "function" as const,
    function: {
        name: "secrets",
        description: "Manage encrypted secrets. Store, retrieve, or delete sensitive data like API keys.",
        parameters: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["store", "retrieve", "delete", "list"],
                    description: "The secret operation"
                },
                key: {
                    type: "string",
                    description: "Secret key name"
                },
                value: {
                    type: "string",
                    description: "Secret value (for store operation)"
                }
            },
            required: ["operation"]
        }
    }
};
