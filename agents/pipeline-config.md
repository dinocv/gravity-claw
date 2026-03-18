# Agent OS Pipeline Configuration

## Full Content Pipeline

### Trigger Commands
- "run full pipeline on [topic]"
- "pipeline: [topic]"
- "full pipeline [topic]"
- "complete content workflow [topic]"

### Pipeline Sequence

```
┌─────────────────────────────────────────────────────────────┐
│                    FULL PIPELINE FLOW                       │
├─────────────────────────────────────────────────────────────┤
│  1. ALEX (Research)                                        │
│     ↓                                                      │
│     Input: Topic/Keyword                                   │
│     Output: Research findings with 5+ sources             │
│     → Pass to Maya                                         │
│                                                              │
│  2. MAYA (Content Writer)                                  │
│     ↓                                                      │
│     Input: Research findings from Alex                     │
│     Output: SEO blog post (800+ words)                    │
│     → Pass to Sam                                          │
│                                                              │
│  3. SAM (Social Media)                                     │
│     ↓                                                      │
│     Input: Blog content from Maya                          │
│     Output: Platform-specific social posts                │
│     → Pass to Jordan                                       │
│                                                              │
│  4. JORDAN (Marketing)                                     │
│     ↓                                                      │
│     Input: Content + Social posts                         │
│     Output: Promotion strategy & campaign plan            │
│     → Complete                                             │
└─────────────────────────────────────────────────────────────┘
```

## Pipeline Execution

### Step 1: Alex Research
```
Task: Research [TOPIC]
Tools: web_search, deep_research
Requirements:
- Find 5+ sources
- Prioritize recent information (30 days)
- Include links to all sources
- Verify facts
Output: Structured research report
```

### Step 2: Maya Content
```
Task: Write blog post from research
Input: Research from Alex
Requirements:
- SEO-optimized (include keyword)
- 800+ words
- Proper headings/subheadings
- Meta description
- SEO title
- Clear CTA
Output: Complete blog post
```

### Step 3: Sam Social
```
Task: Create social media posts
Input: Blog content from Maya
Requirements:
- Instagram post (with hashtags)
- Facebook post
- LinkedIn post
- Suggest posting times
- Platform-specific formatting
Output: 4 social posts
```

### Step 4: Jordan Marketing
```
Task: Create promotion strategy
Input: All content + posts
Requirements:
- 30/60/90 day action plan
- 3+ monetization ideas
- Distribution strategy
- Growth tactics
Output: Complete marketing plan
```

## Manual Pipeline Commands

| Command | Description |
|---------|-------------|
| `alex research [topic]` | Run research only |
| `maya write [topic]` | Run writing only |
| `sam social [topic]` | Run social only |
| `jordan strategy [topic]` | Run marketing only |
| `alex→maya [topic]` | Research + write |
| `maya→sam [topic]` | Write + social |
| `sam→jordan [topic]` | Social + marketing |

## Pipeline Memory

Each pipeline execution should:
1. Store results in agent memory files
2. Reference past executions for context
3. Build on previous work
4. Improve over time based on feedback

## Configuration

### Auto-Pipeline (Default: ON)
When user says "Run full pipeline on [topic]", automatically execute all 4 steps

### Manual Mode (Optional)
User can trigger individual agents or partial pipelines

### Notification Settings
- Notify user after each step completes
- Ask for confirmation before moving to next step (optional)
- Final summary when pipeline complete
