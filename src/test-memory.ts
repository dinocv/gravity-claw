import { loadConfig } from "./config.js";
import { LLM } from "./llm.js";
import { MemoryManager } from "./memory.js";
import { SemanticMemory } from "./semantic.js";
import { FactExtractor } from "./extract-facts.js";

async function test() {
    console.log("🚀 Starting Modular Memory System Verification...");

    const config = loadConfig();
    const llm = new LLM(config);
    const memory = new MemoryManager(config);
    const semantic = new SemanticMemory(config, llm);
    const extractor = new FactExtractor(memory, llm);
    const testUserId = "test-chat-456";

    try {
        // 1. Test SQLite Archival (Tier 2)
        console.log("\n1️⃣ Archiving test turn in SQLite...");
        await memory.archiveTurn(testUserId, "user", "My favorite programming language is TypeScript.");
        console.log("✅ Turn archived in SQLite.");

        // 2. Test SQLite Fact Storage (Tier 1)
        console.log("\n2️⃣ Remembering fact in SQLite...");
        await memory.rememberFact(testUserId, "Likes TypeScript", "preference");
        const facts = await memory.getAllFacts(testUserId);
        console.log(`✅ Found ${facts.length} facts.`);

        // 3. Test Pinecone Archival (Tier 3)
        console.log("\n3️⃣ Archiving to Pinecone...");
        await semantic.archiveTurn(testUserId, "assistant", "That is a great choice! TypeScript is powerful.");
        console.log("✅ Turn archived in Pinecone.");

        // 4. Test Semantic Search
        console.log("\n4️⃣ Testing Pinecone search...");
        const search = await semantic.search(testUserId, "What language do I like?", 1);
        console.log("✅ Results:", search);

        // 5. Test Fact Extraction
        console.log("\n5️⃣ Testing background fact extraction...");
        await extractor.extractFromRecent(testUserId);

        console.log("\n🎉 Modular Verification Complete!");
    } catch (err) {
        console.error("\n❌ Verification Failed:", err);
    }
}

test();
