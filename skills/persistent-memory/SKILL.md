---
name: persistent-memory
description: |
  Manages persistent project memory across sessions. Remembers context, preferences,
  and project state between conversations. Like Perplexity Computer sessions.
---

# Skill: Persistent Memory

This skill maintains persistent memory across all sessions - like Perplexity Computer.

## What It Remembers

1. **Project Context** - Current project details, goals, status
2. **User Preferences** - Preferred tone, response style, tools
3. **Conversation History** - What was discussed previously
4. **File State** - What files exist, their purposes

## Memory Layers

### Layer 1: projects.md
- Compact project registry (loaded at startup)
- Status, tech stack, file locations

### Layer 2: MEMORY.md  
- Curated long-term memory
- Important facts about user
- Key decisions and context

### Layer 3: Session Memory
- Current conversation context
- Recent files being worked on

### Layer 4: Vector Memory (optional)
- Semantic search over all past sessions
- Find related context from weeks ago

## Usage

On every interaction:
1. Check if relevant context exists in memory
2. Load it before processing
3. Update memory after significant interactions
4. Periodically consolidate (curation)

## Auto-save Triggers

Save to memory when:
- User mentions important info (name, preferences, projects)
- Agent makes key decisions
- Task completes or changes state
- User provides feedback

## Memory Files

- `projects.md` - Project registry
- `MEMORY.md` - Long-term memory
- `memory/` - Daily session logs
- `context.json` - Current session context

## Security

- All memory stays local
- No external services
- User controls what to remember
- Can be cleared on demand
