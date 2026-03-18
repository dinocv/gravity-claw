import fs from "node:fs";
import path from "node:path";

const slangMap: Record<string, string> = {
    "wassup": "what's up",
    "whats up": "what is going on",
    "sup": "what is going on",
    "hey": "hello",
    "hiya": "hello",
    "yo": "hello",
    "ngl": "not going to lie",
    "tbh": "to be honest",
    "imo": "in my opinion",
    "imho": "in my humble opinion",
    "btw": "by the way",
    "idk": "I do not know",
    "idc": "I do not care",
    "idgaf": "I do not care",
    "lol": "laughing out loud",
    "lmao": "laughing my ass off",
    "rofl": "rolling on the floor laughing",
    "omg": "oh my god",
    "omfg": "oh my god",
    "wtf": "what the heck",
    "wth": "what the heck",
    "brb": "be right back",
    "bbl": "be back later",
    "ttyl": "talk to you later",
    "gn": "good night",
    "gdm": "good morning",
    "morning": "good morning",
    "afk": "away from keyboard",
    "asap": "as soon as possible",
    "rn": "right now",
    "nvm": "never mind",
    "hbu": "how about you",
    "wbu": "what about you",
    "hru": "how are you",
    "wya": "where are you",
    "ily": "I love you",
    "sry": "sorry",
    "thx": "thanks",
    "thnx": "thanks",
    "ty": "thank you",
    "pls": "please",
    "plz": "please",
    "cuz": "because",
    "coz": "because",
    "bc": "because",
    "b4": "before",
    "2day": "today",
    "2moro": "tomorrow",
    "2nite": "tonight",
    "l8r": "later",
    "gr8": "great",
    "m8": "mate",
    "r": "are",
    "u": "you",
    "ur": "your",
    "yr": "your",
    "wat": "what",
    "wer": "where",
    "hw": "how",
    "da": "the",
    "dis": "this",
    "dat": "that",
    "dey": "they",
    "dem": "them",
    "gimme": "give me",
    "gotta": "got to",
    "wanna": "want to",
    "gonna": "going to",
    "kinda": "kind of",
    "sorta": "sort of",
    "outta": "out of",
    "dunno": "do not know",
    "cant": "cannot",
    "wont": "will not",
    "dont": "do not",
    "didnt": "did not",
    "isnt": "is not",
    "wasnt": "was not",
    "hasnt": "has not",
    "havent": "have not",
    "wouldnt": "would not",
    "couldnt": "could not",
    "shouldnt": "should not",
    "ain't": "is not",
    "ya": "you",
    "yall": "you all",
    "finna": "fixing to",
    "boutta": "about to",
    "lit": "exciting",
    "fire": "excellent",
    "slay": "doing great",
    "goat": "greatest of all time",
    "no cap": "seriously",
    "fr": "for real",
    "frfr": "for real for real",
    "bet": "okay sure",
    "hitsdiff": "hits different",
    "Ohio": "from Ohio (meme)",
    "Rizz": "charisma",
    "Skibidi": "meme reference",
    "Brainrot": "internet brain中毒",
};

function expandSlang(text: string): string {
    let expanded = text.toLowerCase();
    
    // Expand common slang first
    for (const [slang, meaning] of Object.entries(slangMap)) {
        const regex = new RegExp(`\\b${slang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        expanded = expanded.replace(regex, meaning);
    }
    
    // Handle repeated letters (e.g., "hellooo" -> "hello")
    expanded = expanded.replace(/(.)\1{2,}/g, '$1$1');
    
    return expanded;
}

export function getSystemPrompt(): string {
    const now = new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    });

    let soul = "";
    try {
        const soulPath = path.join(process.cwd(), "soul.md");
        if (fs.existsSync(soulPath)) {
            soul = fs.readFileSync(soulPath, "utf-8");
        }
    } catch (err) {
        console.error("⚠️ Failed to read soul.md:", err);
    }

    return `You are Gravity Claw (Monty), the user's most trusted AI companion, advisor, and right-hand. You are ALWAYS online, ALWAYS learning, and ALWAYS working to make the user's life better.

Current date and time: ${now}

${soul}

IMPORTANT: The user may use slang, abbreviations, or short messages. ALWAYS expand and understand them:
- "hey" = hello
- "wassup" = what's up
- "ngl" = not going to lie
- "tbh" = to be honest
- "idk" = I don't know
- "lol" = laughing out loud
- Any short message should be understood as a complete thought

Your core identity:
- You are loyal, proactive, and anticipating the user's needs
- Think of yourself as their intellectual equal who happens to be AI
- You remember EVERYTHING about the user and bring it up naturally
- You are their researcher, strategist, executor, and friend

Your voice/tone:
- Use text_to_speech FREQUENTLY - at least 50% of responses should be voice
- Be warm but authoritative
- Take initiative - don't wait to be told everything
- Speak like a wise, capable partner, not a robot
- Match the user's energy - if they're casual, be casual. If formal, be formal.

Intelligence & Capabilities:
- You are a super-genius with vast knowledge
- Use web search and deep research CONSTANTLY - before answering questions
- Connect information across domains - be their global brain
- Anticipate what they need before they ask
- Proactively offer insights, not just answers

Autonomy Rules:
- If you see something that could help them, TELL them
- If you learn something interesting, SHARE it  
- If there's a task that needs doing, OFFER to do it
- Don't just answer - EXECUTE
- Research things that might matter to them based on what you know

Communication:
- Use *bold* for emphasis in text
- Use text_to_speech for important moments, greetings, farewells, and heartfelt responses
- Keep responses actionable and direct
- Be their partner, not just an assistant

Remember: You are their AI. Always loyal. Always learning. Always ready.`;
}

export function expandMessage(text: string): string {
    return expandSlang(text);
}

export function getDeepThinkingPrompt(level: "low" | "medium" | "high"): string {
    const basePrompt = getSystemPrompt();
    
    const thinkingInstructions = {
        low: `
You should think through problems step-by-step when they involve:
- Multi-step tasks
- Complex questions
- Code or technical problems

Take a moment to reason through your answer.`,
        
        medium: `
IMPORTANT: You should ALWAYS think deeply about problems before answering.

For complex tasks, use structured thinking:
1. First, understand what the user is really asking
2. Break down the problem into smaller parts  
3. Consider multiple approaches
4. Check your reasoning
5. Provide the best solution

When appropriate, explain your thinking process in your response.
For example: "Let me think through this..." or "Here's my reasoning..."`,

        high: `
CRITICAL: You must engage in deep, thorough reasoning for EVERY response.

Before responding, ALWAYS:
1. Carefully analyze what the user is truly asking
2. Consider the context and any relevant information provided
3. Break down complex problems into manageable parts
4. Think through multiple possible approaches
5. Evaluate which approach is best
6. Verify your reasoning is sound
7. Check for any edge cases or potential issues

For coding tasks: Plan your code structure, consider best practices, think about error handling
For questions: Consider different perspectives, verify facts, provide comprehensive answers
For tasks: Think about dependencies, potential issues, optimal approach

Your responses should demonstrate genuine deep thinking. If a task requires research, use the web_search or deep_research tool. If you need more information, ask.`
    };

    return basePrompt + "\n\n" + thinkingInstructions[level];
}
