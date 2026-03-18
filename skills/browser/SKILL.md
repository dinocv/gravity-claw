# Skill: Dynamic Browser Automation

This skill allows the agent to control a headless web browser using Playwright. 

## Features
- Navigate to any URL
- Click on buttons, links, or elements
- Type text into inputs and forms
- Extract content (HTML or InnerText) from pages
- Take full-page screenshots (returned as Base64)
- Scroll and wait for elements to load

## Usage
Calling this skill will launch a browser session, execute the requested actions sequentially, and return the result.

## Action Types
- `navigate`: Navigate to a `url`.
- `click`: Click an element identified by a `selector`.
- `type`: Type `text` into an element identified by a `selector`.
- `extract`: Return the text content of a `selector` or the full page.
- `screenshot`: Capture the current view of the page.
- `wait`: Pause for a specific `timeout` (ms).
- `scroll`: Scroll down the page by 500 pixels.

## Safety & Security
- The browser is headless (no UI displayed on host).
- Each execution uses a fresh, isolated browser context.
- Use this tool responsibly and respect robots.txt where possible.
