# Agent OS Router Configuration

## Quick Command Shortcuts

### Direct Agent Commands
| Command | Agent | Description |
|---------|-------|--------------|
| `alex:` or `research:` | Alex | Run deep research |
| `maya:` or `write:` or `blog:` | Maya | Write content |
| `jordan:` or `market:` or `strategy:` | Jordan | Marketing strategy |
| `dev:` or `code:` or `build:` | Dev | Web development |
| `sam:` or `social:` or `post:` | Sam | Social media |

### Pipeline Commands
| Command | Description |
|---------|-------------|
| `pipeline:` or `full pipeline:` | Run Alex → Maya → Sam → Jordan pipeline |
| `content pipeline:` | Run research + write only |
| `promote:` | Run Maya → Sam → Jordan |

## Natural Language Triggers

### Research Tasks
- "research [topic]" → Alex
- "find information about [topic]" → Alex
- "look up [topic]" → Alex
- "investigate [topic]" → Alex

### Writing Tasks  
- "write a blog post about [topic]" → Maya
- "create content about [topic]" → Maya
- "write [type] content" → Maya

### Marketing Tasks
- "create marketing strategy for [topic]" → Jordan
- "plan a campaign" → Jordan
- "monetization ideas" → Jordan

### Development Tasks
- "build [something]" → Dev
- "code [something]" → Dev
- "create a [website/app/component]" → Dev

### Social Media Tasks
- "create social posts" → Sam
- "make an Instagram post" → Sam
- "write social media content" → Sam

## Role Boundaries (Decline Messages)

### When Agent Receives Out-of-Scope Task
```
[Agent Name]: That's not my department. For [appropriate task type], you should talk to [appropriate agent]. 

Available agents:
- Alex: Research and information gathering
- Maya: Content and blog writing  
- Jordan: Marketing and strategy
- Dev: Coding and web development
- Sam: Social media and posts
```

## Full Pipeline Flow

```
User Input → Route → Agent → Output

Pipeline Mode:
1. Alex researches topic first
2. Alex passes findings to Maya
3. Maya writes content/blog
4. Maya passes to Sam
5. Sam creates social posts
6. Sam passes to Jordan
7. Jordan creates promotion strategy
```

## Usage Examples

```
User: "alex: research AI trends 2026"
→ Dispatch to Alex

User: "maya: write blog about remote work"
→ Dispatch to Maya

User: "dev: build a landing page"
→ Dispatch to Dev

User: "pipeline: about quantum computing"
→ Full pipeline execution
```
