# Skill: Deep Research Agent

This skill allows the agent to perform multi-step web research on any topic. 

## Features
- Search Google, Bing, or DuckDuckGo.
- Automatically generate research queries based on the topic and requested `depth`.
- Deduplicate search results across providers.
- Generate a formatted markdown report summarize findings.
- Source URL attribution for all facts.

## Depths
- `quick`: 4 basic queries to get a high-level summary.
- `deep`: 7 queries (includes alternatives, pros/cons, and how-to).
- `comprehensive`: 10+ queries (includes latest news, advanced guides, and future-looking trends).

## Usage
Calling this skill will run the research in the background and return a structured report to the agent.
- `topic`: The subject to research.
- `depth`: How deep to go (defaults to `deep`).

## Best Practices
- Use a clear, specific topic.
- Prefer `deep` for technical research and `quick` for simple fact-checks.
