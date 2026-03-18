import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SECRETS_FILE = path.join(process.cwd(), '.secrets.enc');
const ALGORITHM = 'aes-256-gcm';

export class SecretsVault {
    private masterKey: Buffer;

    constructor() {
        const masterKeyHex = process.env.VAULT_MASTER_KEY;
        if (!masterKeyHex) {
            // Generate a key from a combo of machine-specific info if no master key
            const machineId = process.env.COMPUTERNAME || process.env.HOSTNAME || 'gravity-claw';
            this.masterKey = crypto.scryptSync(machineId, 'gravity-claw-salt', 32);
        } else {
            this.masterKey = Buffer.from(masterKeyHex, 'hex');
        }
    }

    private encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv) as crypto.CipherGCM;
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return JSON.stringify({
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            data: encrypted.toString('hex')
        });
    }

    private decrypt(encryptedJson: string): string {
        const { iv, tag, data } = JSON.parse(encryptedJson);
        const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, Buffer.from(iv, 'hex')) as crypto.DecipherGCM;
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
    }

    /** Store a secret by key */
    set(key: string, value: string): void {
        let secrets: Record<string, string> = {};
        if (fs.existsSync(SECRETS_FILE)) {
            try {
                const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
                secrets = JSON.parse(this.decrypt(raw));
            } catch (err) {
                console.error("❌ Failed to read secrets file:", err);
            }
        }
        secrets[key] = value;
        fs.writeFileSync(SECRETS_FILE, this.encrypt(JSON.stringify(secrets)), 'utf-8');
        console.log(`🔒 Secret stored: ${key}`);
    }

    /** Get a secret by key */
    get(key: string): string | undefined {
        if (!fs.existsSync(SECRETS_FILE)) return undefined;
        try {
            const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
            const secrets = JSON.parse(this.decrypt(raw));
            return secrets[key];
        } catch (err) {
            console.error("❌ Failed to get secret:", err);
            return undefined;
        }
    }

    /** List all stored secret keys (NOT values) */
    list(): string[] {
        if (!fs.existsSync(SECRETS_FILE)) return [];
        try {
            const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
            return Object.keys(JSON.parse(this.decrypt(raw)));
        } catch (err) {
            console.error("❌ Failed to list secrets:", err);
            return [];
        }
    }

    /** Delete a secret */
    delete(key: string): boolean {
        if (!fs.existsSync(SECRETS_FILE)) return false;
        try {
            const raw = fs.readFileSync(SECRETS_FILE, 'utf-8');
            const secrets = JSON.parse(this.decrypt(raw));
            if (!(key in secrets)) return false;
            delete secrets[key];
            fs.writeFileSync(SECRETS_FILE, this.encrypt(JSON.stringify(secrets)), 'utf-8');
            return true;
        } catch (err) {
            console.error("❌ Failed to delete secret:", err);
            return false;
        }
    }
}

// Singleton instance
export const vault = new SecretsVault();
