---
name: multi-model-orchestrator
description: |
  Coordinates multiple AI models for different tasks. Routes requests to the best model
  based on task type, cost, and capability. Like Perplexity Computer but free and local.
---

# Skill: Multi-Model Orchestrator

This skill manages multiple AI models and routes tasks to the best-fit model - similar to Perplexity Computer but free and local.

## The Model Pool

| Model | Best For | Cost |
|-------|----------|------|
| llama3.2 (Ollama) | Simple tasks, fast responses | Free |
| gemini-2.0-flash | General reasoning, speed | Free tier |
| claude-3.5-sonnet | Complex reasoning, coding | Paid |
| deepseek-chat | Math, coding | Cheap |

## Task Routing Rules

1. **Simple questions** → llama3.2 (fastest, free)
2. **Research, analysis** → gemini-2.0-flash (good reasoning, free)
3. **Complex coding** → deepseek (great for code, cheap)
4. **Critical reasoning** → gemini with thinking (best accuracy)

## Usage

When processing any request:
1. Analyze the task complexity
2. Select the best model from the pool
3. Execute with that model
4. Return results

## Benefits

- **Cost savings** - Use free models for simple tasks
- **Speed** - Fast models for quick responses
- **Quality** - Best model for complex tasks
- **Reliability** - Fallback if one model fails

## Automatic Routing

The orchestrator should automatically:
- Detect task type (research, coding, simple question)
- Choose optimal model
- Fall back to alternatives on failure
- Log which model was used for transparency
