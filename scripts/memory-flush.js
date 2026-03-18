#!/usr/bin/env node
/**
 * Memory Flush Script
 * Flushes memory files to vector database for semantic search
 * Uses Ollama for free local embeddings
 * 
 * Usage: node scripts/memory-flush.js [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.join(__dirname, "..");
const MEMORY_DIR = path.join(WORKSPACE, "memory");
const FLUSH_TRACKER = path.join(MEMORY_DIR, "vector-flush-tracker.json");

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function getEmbedding(text) {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
    });
    
    if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding;
}

function loadTracker() {
    if (fs.existsSync(FLUSH_TRACKER)) {
        return JSON.parse(fs.readFileSync(FLUSH_TRACKER, "utf-8"));
    }
    return { flushed_files: {} };
}

function saveTracker(tracker) {
    fs.writeFileSync(FLUSH_TRACKER, JSON.stringify(tracker, null, 2));
}

function fileHash(filepath) {
    const content = fs.readFileSync(filepath, "utf-8");
    return content.split("").reduce((a, b) => a + b.charCodeAt(0), 0).toString(16);
}

function chunkMarkdown(text, sourceFile) {
    const chunks = [];
    const lines = text.split("\n");
    let currentSection = "";
    let currentText = [];

    for (const line of lines) {
        if (line.match(/^#{1,3}\s/)) {
            if (currentText.length > 3) {
                chunks.push({
                    text: currentText.join("\n").trim(),
                    label: currentSection.replace(/^#+\s/, "").trim(),
                    source_file: sourceFile
                });
            }
            currentSection = line;
            currentText = [line];
        } else {
            currentText.push(line);
        }
    }

    if (currentText.length > 3) {
        chunks.push({
            text: currentText.join("\n").trim(),
            label: currentSection.replace(/^#+\s/, "").trim(),
            source_file: sourceFile
        });
    }

    return chunks.filter(c => c.text.length > 20);
}

async function storeInSupabase(text, label, source) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.log("⚠️ Supabase not configured, skipping store");
        return;
    }

    try {
        const embedding = await getEmbedding(text);
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/memory_vectors`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({
                text: text.substring(0, 5000),
                label: label,
                category: "daily-note",
                source: source,
                embedding: embedding
            })
        });

        if (!response.ok) {
            throw new Error(`Supabase insert failed: ${response.status}`);
        }
        
        return true;
    } catch (err) {
        console.error("❌ Store failed:", err.message);
        return false;
    }
}

async function flush(dryRun = false) {
    console.log("🧠 Memory Flush starting...\n");

    const tracker = loadTracker();
    const files = [];

    if (fs.existsSync(MEMORY_DIR)) {
        const mdFiles = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith(".md"));
        for (const f of mdFiles) {
            files.push(path.join(MEMORY_DIR, f));
        }
    }

    const memoryMd = path.join(WORKSPACE, "MEMORY.md");
    if (fs.existsSync(memoryMd)) {
        files.push(memoryMd);
    }

    const projectsMd = path.join(WORKSPACE, "projects.md");
    if (fs.existsSync(projectsMd)) {
        files.push(projectsMd);
    }

    let totalStored = 0;

    for (const filepath of files) {
        const fname = path.basename(filepath);
        const fhash = fileHash(filepath);

        if (!dryRun && tracker.flushed_files[fname] === fhash) {
            console.log(`⏭️  Skipped (unchanged): ${fname}`);
            continue;
        }

        const content = fs.readFileSync(filepath, "utf-8");
        const chunks = chunkMarkdown(content, fname);

        if (dryRun) {
            console.log(`[DRY RUN] ${fname}: ${chunks.length} chunks`);
            continue;
        }

        for (const chunk of chunks) {
            const success = await storeInSupabase(chunk.text, chunk.label, chunk.source_file);
            if (success) totalStored++;
        }

        tracker.flushed_files[fname] = fhash;
        console.log(`✅ Flushed: ${fname} (${chunks.length} chunks)`);
    }

    if (!dryRun) {
        saveTracker(tracker);
    }

    console.log(`\n📊 Total stored: ${totalStored}`);
    console.log("✨ Flush complete!");
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-d");

flush(dryRun).catch(console.error);
