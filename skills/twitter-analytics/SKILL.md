---
name: twitter-analytics
description: |
  Analyze Twitter/X profiles, trends, and content. Use when user asks about Twitter stats, 
  follower counts, trending topics, or wants to analyze a Twitter profile.
  This skill uses web scraping - no API keys required.
---

# Skill: Twitter/X Analytics

This skill analyzes Twitter/X profiles, trends, and content using web scraping - completely free.

## When to Use

- User asks about Twitter stats, follower count, or profile analytics
- User wants to check trending topics on X
- User wants to analyze a Twitter profile's performance
- User asks "how many followers does [account] have"
- User wants to find tweets about a topic

## How It Works

Uses the browser skill to scrape Twitter/X data directly - no API keys needed.

## Capabilities

1. **Profile Analysis**
   - Follower/following count
   - Bio and location
   - Account verification status
   - Recent tweet engagement

2. **Tweet Metrics**
   - Likes, retweets, replies count
   - View counts (if visible)
   - Engagement rate calculation

3. **Trending Topics**
   - Current trending hashtags
   - Trending topics by category

4. **Content Search**
   - Search tweets by keyword
   - Find tweets from specific users

## Usage Examples

When user asks about Twitter:

1. "How many followers does @elonmusk have"
   → Navigate to twitter.com/elonmusk, extract follower count

2. "What's trending on Twitter"
   → Navigate to twitter.com/explore/tabs/foryou, extract trending topics

3. "Find tweets about AI news"
   → Navigate to twitter.com/search?q=AI+news, extract tweet list

## Output Format

Return analytics in this format:

```
📊 Twitter Analysis: @username

👥 Followers: [count]
📝 Following: [count]
📝 Tweets: [count]
✅ Verified: Yes/No
📍 Location: [if available]

📈 Recent Engagement:
- [Tweet 1]: ❤️ [likes] 🔁 [retweets] 💬 [replies]
- [Tweet 2]: ❤️ [likes] 🔁 [retweets] 💬 [replies]
```

## Security & Privacy

- ✅ No API keys required
- ✅ No data leaves your machine
- ✅ Uses your existing browser skill
- ✅ Respects rate limits (add delays between requests)

## Limitations

- Cannot post tweets (read-only)
- Rate limited by Twitter's anti-scraping
- Some data may be hidden for private accounts
- Use delays to avoid getting rate limited
