---
name: humanizer
description: |
  Make AI-generated text sound more natural and human. Use when user asks to "humanize", "make natural", 
  or "remove AI-sounding parts" from text. Also applies automatically to all responses.
---

# Skill: Humanizer

This skill removes signs of AI-generated writing from text, making it sound natural and human.

## When to Use

- User explicitly asks to "humanize" or "make natural"
- User says "remove AI-sounding parts"
- Bot responses are too formal, robotic, or have AI patterns

## The 24 AI Patterns to Remove

### Content Patterns
1. **Significance inflation** - Remove "pivotal moment", "transformative potential"
2. **Name-dropping** - Reduce "featured in NYT, BBC, FT"
3. **Superficial -ing** - Remove "symbolizing, reflecting, showcasing"
4. **Promotional language** - Remove "breathtaking", "cutting-edge"
5. **Vague attributions** - Replace "Experts believe" with specifics
6. **Formulaic challenges** - Remove "Despite challenges..."

### Language Patterns
7. **AI vocabulary** - Replace "Additionally""also", "→testament"→"remains"
8. **Copula avoidance** - Replace "serves as"→"is", "features"→"has"
9. **Negative parallelisms** - Remove "It's not just X, it's Y"
10. **Rule of three** - Use natural number of items
11. **Synonym cycling** - Repeat words when clearest
12. **False ranges** - List topics directly

### Style Patterns
13. **Em dash overuse** - Use commas or periods
14. **Boldface overuse** - Remove excessive **bolding**
15. **Inline-header lists** - Convert to prose
16. **Title Case Headings** - Use sentence case
17. **Emojis** - Remove 🚀 💡 ✅
18. **Curly quotes** - Use straight quotes ""

### Communication Patterns
19. **Chatbot artifacts** - Remove "I hope this helps!"
20. **Cutoff disclaimers** - Remove "While details are limited..."
21. **Sycophantic tone** - Remove "Great question! Absolutely right!"

### Filler & Hedging
22. **Filler phrases** - "In order to"→"To", "Due to the fact"→"Because"
23. **Excessive hedging** - "could potentially possibly"→"may"
24. **Generic conclusions** - "The future looks bright"→specific facts

## How to Apply

When humanizing text:

1. **Read the full text**
2. **Identify AI patterns** from the 24 above
3. **Rewrite** to remove each pattern
4. **Audit pass** - check if it still sounds AI-generated
5. **Final rewrite** if needed

## Example Transformation

**Before (AI-sounding):**
> Great question! AI-assisted coding serves as an transformative testament to the potential of LLMs. In today's rapidly evolving landscape, these groundbreaking tools are reshaping how engineers work. It's not just about autocomplete; it's about unlocking creativity at scale.

**After (Humanized):**
> AI coding assistants speed up the boring parts of the job. They're great at boilerplate: config files and glue code. The dangerous part is how confident the suggestions look.

## Output Format

When returning humanized text, briefly note what was changed:
```
✅ Humanized (removed: chatbot artifacts, filler phrases, significance inflation)
[your humanized text here]
```

## Security & Privacy

- ✅ No external APIs
- ✅ All processing local
- ✅ No data leaves your machine
