---
name: tiktok-analytics
description: |
  Analyze TikTok profiles, trends, and content. Use when user asks about TikTok stats,
  follower counts, trending sounds, or wants to analyze a TikTok profile.
  This skill uses web scraping - no API keys required.
---

# Skill: TikTok Analytics

This skill analyzes TikTok profiles, trends, and content using web scraping - completely free.

## When to Use

- User asks about TikTok stats, follower count, or profile analytics
- User wants to check trending sounds or hashtags on TikTok
- User wants to analyze a TikTok profile's performance
- User asks "how many followers does [account] have on TikTok"
- User wants to find trending TikToks about a topic

## How It Works

Uses the browser skill to scrape TikTok data directly - no API keys needed.

## Capabilities

1. **Profile Analysis**
   - Follower/following count
   - Total likes
   - Bio description
   - Verification status

2. **Video Metrics**
   - View count
   - Like count
   - Comment count
   - Share count

3. **Trending Content**
   - Trending sounds
   - Trending hashtags
   - For You page analysis

4. **Content Discovery**
   - Search videos by keyword
   - Find videos from specific creators

## Usage Examples

When user asks about TikTok:

1. "How many followers does @khaby.lame have"
   → Navigate to tiktok.com/@khaby.lame, extract follower count

2. "What's trending on TikTok"
   → Navigate to tiktok.com/trending, extract trending videos

3. "Find TikToks about coding"
   → Navigate to tiktok.com/discover/coding, extract video list

## Output Format

Return analytics in this format:

```
📊 TikTok Analysis: @username

👥 Followers: [count]
❤️ Total Likes: [count]
📝 Following: [count]
✅ Verified: Yes/No

🔥 Recent Videos:
- [Video 1]: 👁️ [views] ❤️ [likes] 💬 [comments]
- [Video 2]: 👁️ [views] ❤️ [likes] 💬 [comments]
```

## Security & Privacy

- ✅ No API keys required
- ✅ No data leaves your machine
- ✅ Uses your existing browser skill
- ✅ Use delays to avoid rate limiting

## Limitations

- Cannot post videos (read-only)
- Rate limited by TikTok's anti-scraping
- Some data may be hidden for private accounts
- Add 2-3 second delays between actions
