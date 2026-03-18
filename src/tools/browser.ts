import { chromium, type Browser, type Page } from "playwright";

export interface BrowserAction {
    type: "navigate" | "click" | "type" | "screenshot" | "extract" | "wait" | "scroll";
    selector?: string;
    value?: string;
    url?: string;
    timeout?: number;
}

export interface BrowserResult {
    success: boolean;
    data?: string;
    screenshot?: string;
    error?: string;
}

export class BrowserAutomator {
    private defaultTimeout: number = 30000;

    async execute(actions: BrowserAction[]): Promise<BrowserResult> {
        let browser: Browser | null = null;
        try {
            console.log("🌐 Launching browser...");
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            });
            const page = await context.newPage();
            page.setDefaultTimeout(this.defaultTimeout);

            let lastData = "";
            let lastScreenshot = "";

            for (const action of actions) {
                console.log(`🌐 Performing action: ${action.type}`);
                switch (action.type) {
                    case "navigate":
                        if (action.url) {
                            await page.goto(action.url, { waitUntil: "networkidle" });
                        }
                        break;
                    case "click":
                        if (action.selector) {
                            await page.waitForSelector(action.selector);
                            await page.click(action.selector);
                        }
                        break;
                    case "type":
                        if (action.selector && action.value) {
                            await page.waitForSelector(action.selector);
                            await page.fill(action.selector, action.value);
                        }
                        break;
                    case "wait":
                        await page.waitForTimeout(action.timeout || 2000);
                        break;
                    case "screenshot":
                        const buffer = await page.screenshot({ fullPage: true });
                        lastScreenshot = buffer.toString("base64");
                        break;
                    case "extract":
                        if (action.selector) {
                            lastData = await page.innerText(action.selector);
                        } else {
                            lastData = await page.content();
                        }
                        break;
                    case "scroll":
                        await page.evaluate(() => window.scrollBy(0, 500));
                        break;
                }
            }

            return {
                success: true,
                data: lastData,
                screenshot: lastScreenshot
            };
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error("❌ Browser error:", errMsg);
            return {
                success: false,
                error: errMsg
            };
        } finally {
            if (browser) {
                await browser.close().catch(() => { });
            }
        }
    }

    async navigate(url: string): Promise<BrowserResult> {
        return this.execute([{ type: "navigate", value: url }]);
    }

    async click(selector: string): Promise<BrowserResult> {
        return this.execute([{ type: "click", selector }]);
    }

    async type(selector: string, text: string): Promise<BrowserResult> {
        return this.execute([{ type: "type", selector, value: text }]);
    }

    async screenshot(): Promise<BrowserResult> {
        return this.execute([{ type: "screenshot" }]);
    }

    async extract(selector: string): Promise<BrowserResult> {
        return this.execute([{ type: "extract", selector }]);
    }
}

export const browserToolsDef = {
    type: "function" as const,
    function: {
        name: "browser",
        description: "Automate browser actions. Navigate, click, type, take screenshots, and extract content from web pages.",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["navigate", "click", "type", "screenshot", "extract", "wait"],
                    description: "Browser action to perform"
                },
                url: {
                    type: "string",
                    description: "URL (for navigate action)"
                },
                selector: {
                    type: "string",
                    description: "CSS selector (for click, type, extract actions)"
                },
                text: {
                    type: "string",
                    description: "Text to type (for type action)"
                },
                timeout: {
                    type: "number",
                    description: "Timeout in milliseconds"
                }
            },
            required: ["action"]
        }
    }
};
