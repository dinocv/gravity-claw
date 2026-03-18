---
name: skill-discovery
description: |
  Auto-discovers and manages all available skills and tools. Use this to list available capabilities,
  find skills for specific tasks, or understand what the agent can do.
---

# Skill: Skill Discovery & Management

This skill provides automatic discovery and management of all available skills and tools.

## Capabilities

1. **List All Skills** - Show all installed skills with descriptions
2. **Find Skills** - Search for skills that can handle specific tasks
3. **Skill Status** - Show which skills are active/loaded
4. **Tool Registry** - List all available tools and their purposes

## Usage

When user asks "what can you do?" or "what skills do you have?":
- Use skill_discovery to list all available capabilities
- Present them in organized categories

## Categories

Organize skills by domain:
- **Research**: deep_research, web_search, browser
- **Analytics**: twitter_analytics, tiktok_analytics, youtube_analytics
- **Communication**: email, calendar, telegram
- **Development**: python, shell, file_operations
- **Content**: humanizer, planner
- **Security**: skill_guard

## Output Format

```
📦 Available Skills (X total)

🔍 Research:
   • deep_research - Perform deep research on any topic
   • web_search - Search the web for information
   • browser - Control a headless browser

📊 Analytics:
   • twitter_analytics - Analyze Twitter profiles and trends
   • tiktok_analytics - Analyze TikTok profiles and trends
   • youtube_analytics - Analyze YouTube channels and videos

🛠️ Tools:
   • python - Execute Python code
   • shell - Run shell commands
   • file_operations - Read/write files

[etc...]
```

## Auto-discovery

On startup, the agent should:
1. Scan the skills/ directory for all SKILL.md files
2. Parse each skill's name and description
3. Build a registry of capabilities
4. Make this available for skill matching
