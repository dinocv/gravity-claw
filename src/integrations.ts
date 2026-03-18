import { google } from "googleapis";

export class CalendarManager {
    private calendar: any;
    private _initialized: boolean = false;

    constructor(accessToken: string) {
        if (accessToken) {
            this.init(accessToken);
        }
    }

    get initialized(): boolean {
        return this._initialized;
    }

    private async init(accessToken: string) {
        try {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: accessToken });
            this.calendar = google.calendar({ version: "v3", auth });
            this._initialized = true;
            console.log("✅ Google Calendar initialized");
        } catch (err) {
            console.error("❌ Calendar init failed:", err);
        }
    }

    async listEvents(maxResults: number = 10): Promise<any[]> {
        if (!this._initialized) return [];
        
        try {
            const res = await this.calendar.events.list({
                calendarId: "primary",
                timeMin: new Date().toISOString(),
                maxResults,
                singleEvents: true,
                orderBy: "startTime",
            });
            return res.data.items || [];
        } catch (err) {
            console.error("❌ List events failed:", err);
            return [];
        }
    }

    async createEvent(event: {
        summary: string;
        description?: string;
        start: Date;
        end: Date;
        attendees?: string[];
    }): Promise<string | null> {
        if (!this._initialized) return null;

        try {
            const res = await this.calendar.events.insert({
                calendarId: "primary",
                requestBody: {
                    summary: event.summary,
                    description: event.description,
                    start: { dateTime: event.start.toISOString() },
                    end: { dateTime: event.end.toISOString() },
                    attendees: event.attendees?.map(email => ({ email })),
                },
            });
            return res.data.htmlLink;
        } catch (err) {
            console.error("❌ Create event failed:", err);
            return null;
        }
    }

    async deleteEvent(eventId: string): Promise<boolean> {
        if (!this._initialized) return false;

        try {
            await this.calendar.events.delete({
                calendarId: "primary",
                eventId,
            });
            return true;
        } catch (err) {
            console.error("❌ Delete event failed:", err);
            return false;
        }
    }

    getStatus(): string {
        return this._initialized ? "✅ Connected" : "❌ Not connected";
    }
}

export class GmailManager {
    private gmail: any;
    private _initialized: boolean = false;

    constructor(accessToken: string) {
        if (accessToken) {
            this.init(accessToken);
        }
    }

    get initialized(): boolean {
        return this._initialized;
    }

    private async init(accessToken: string) {
        try {
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: accessToken });
            this.gmail = google.gmail({ version: "v1", auth });
            this._initialized = true;
            console.log("✅ Gmail initialized");
        } catch (err) {
            console.error("❌ Gmail init failed:", err);
        }
    }

    async listEmails(maxResults: number = 10): Promise<any[]> {
        if (!this._initialized) return [];

        try {
            const res = await this.gmail.users.messages.list({
                userId: "me",
                maxResults,
                labelIds: ["INBOX"],
            });
            
            if (!res.data.messages) return [];

            const emails = await Promise.all(
                res.data.messages.slice(0, 5).map(async (msg: any) => {
                    const detail = await this.gmail.users.messages.get({
                        userId: "me",
                        id: msg.id,
                    });
                    return this.parseEmail(detail.data);
                })
            );
            
            return emails;
        } catch (err) {
            console.error("❌ List emails failed:", err);
            return [];
        }
    }

    private parseEmail(message: any): any {
        const headers = message.payload.headers;
        const getHeader = (name: string) => 
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        return {
            id: message.id,
            subject: getHeader("subject"),
            from: getHeader("from"),
            date: getHeader("date"),
            snippet: message.snippet,
        };
    }

    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        if (!this._initialized) return false;

        try {
            const message = [
                `To: ${to}`,
                `Subject: ${subject}`,
                "",
                body
            ].join("\n");

            const encoded = Buffer.from(message).toString("base64url");

            await this.gmail.users.messages.send({
                userId: "me",
                requestBody: { raw: encoded },
            });
            return true;
        } catch (err) {
            console.error("❌ Send email failed:", err);
            return false;
        }
    }

    getStatus(): string {
        return this._initialized ? "✅ Connected" : "❌ Not connected";
    }
}
