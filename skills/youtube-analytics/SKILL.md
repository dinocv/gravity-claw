---
name: youtube-analytics
description: |
  Analyze YouTube channels, videos, and trends. Use when user asks about YouTube stats,
  subscriber counts, video performance, or wants to analyze a YouTube channel.
  This skill uses web scraping - no API keys required.
---

# Skill: YouTube Analytics

This skill analyzes YouTube channels, videos, and trends using web scraping - completely free.

## When to Use

- User asks about YouTube stats, subscriber count, or channel analytics
- User wants to check trending videos on YouTube
- User wants to analyze a YouTube channel's performance
- User asks "how many subscribers does [channel] have"
- User wants to find videos about a topic

## How It Works

Uses the browser skill to scrape YouTube data directly - no API keys needed.

## Capabilities

1. **Channel Analysis**
   - Subscriber count
   - Total video count
   - Total views
   - Channel description
   - Verification status

2. **Video Metrics**
   - View count
   - Like count
   - Comment count
   - Upload date

3. **Trending Content**
   - Trending videos
   - Trending music
   - Category rankings

4. **Content Discovery**
   - Search videos by keyword
   - Find videos from specific channels

## Usage Examples

When user asks about YouTube:

1. "How many subscribers does MrBeast have"
   → Navigate to youtube.com/@MrBeast, extract subscriber count

2. "What's trending on YouTube"
   → Navigate to youtube.com/feed/trending, extract trending videos

3. "Find videos about Python tutorials"
   → Navigate to youtube.com/results?search_query=python+tutorial, extract results

## Output Format

Return analytics in this format:

```
📊 YouTube Analysis: @channel

👥 Subscribers: [count]
📹 Total Videos: [count]
👁️ Total Views: [count]
✅ Verified: Yes/No

🔥 Recent Videos:
- [Video 1]: 👁️ [views] ❤️ [likes] 💬 [comments]
- [Video 2]: 👁️ [views] ❤️ [likes] 💬 [comments]
```

## Security & Privacy

- ✅ No API keys required
- ✅ No data leaves your machine
- ✅ Uses your existing browser skill
- ✅ Add delays to avoid rate limiting

## Limitations

- Cannot post comments or videos (read-only)
- Rate limited by YouTube's anti-scraping
- Some data may be hidden for private channels
- Add 2-3 second delays between actions
- Live subscriber counts may be approximate
