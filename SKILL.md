---
name: gravity-claw
description: A personal AI agent with persistent memory, skills system, MCP support, and autonomous capabilities. Use when helping users with general tasks, research, coding, automation, or anything requiring memory of past interactions. Supports Telegram interface, skill management, scheduling, and more.
license: Proprietary
compatibility: Node.js >=22, Telegram Bot API, OpenAI/Anthropic APIs, Pinecone, Supabase
metadata:
  author: Monty
  version: "0.1.0"
---

# Gravity Claw

A personal AI assistant with persistent memory, skills system, and autonomous capabilities.

## Core Capabilities

- **Persistent Memory**: Remembers facts, preferences, and context across conversations using vector storage (Pinecone) and structured memory (SQLite)
- **Skills System**: Discoverable skills that extend capabilities (browser automation, deep research, planning, etc.)
- **MCP Integration**: Model Context Protocol support for connecting to external tools and services
- **Autonomous Brain**: Can operate independently with scheduled tasks and self-initiated actions
- **Telegram Interface**: Full-featured Telegram bot for user interaction
- **Smart Home**: Control smart home devices via APIs
- **Webhooks**: Receive and process webhook events
- **Scheduler**: Time-based task automation with cron support
- **TTS/Transcribe**: Text-to-speech and speech-to-text capabilities

## Memory System

Gravity Claw maintains different types of memory:

1. **Semantic Memory**: Vector embeddings stored in Pinecone for semantic search
2. **Episodic Memory**: Structured facts about users, preferences, and past interactions in SQLite
3. **Working Memory**: Active conversation context

## Skills

Gravity Claw has a skills system located in `/skills/`. Each skill is a folder with a `SKILL.md` file.

### Built-in Skills

- `planner` - Architectural planning with Task Manifesto
- `browser` - Web automation using Playwright
- `deep_research` - Comprehensive research with web search
- `python` - Python script execution
- `self_correction` - Error recovery and retry logic
- `humanizer` - Naturalize AI-generated text
- `persistent-memory` - Long-term memory management
- `skill-discovery` - Find and recommend skills
- `multi-model-orchestrator` - Coordinate multiple LLM models
- `skill-guard` - Validate skill safety
- `youtube-analytics` - YouTube data analysis
- `twitter-analytics` - Twitter/X data analysis
- `tiktok-analytics` - TikTok data analysis
- `agent-skills-ecosystem` - Knowledge about Agent Skills & MCP

## Usage

When activated, Gravity Claw:

1. Loads relevant context from persistent memory
2. Discovers and activates relevant skills based on the task
3. Executes the requested operation with memory persistence
4. Updates memory with new facts learned during interaction

## Tools Available

- Browser automation (Playwright)
- Shell command execution
- Web research and search
- File system operations
- HTTP requests/webhooks
- Smart home device control
- Scheduled task execution
- Voice synthesis and transcription

## Environment

- Runs on Node.js >= 22
- Supports OpenAI and Anthropic models
- Integrates with Telegram Bot API
- Uses Pinecone for vector memory
- Uses Supabase for data storage
- Uses SQLite for local data
