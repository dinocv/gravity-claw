/**
 * Human-in-the-Loop (HIL) Interrupt System
 * 
 * Based on CopilotKit's interrupt pattern:
 * https://docs.copilotkit.ai/shared-state
 * 
 * Allows agents to pause execution and request user confirmation
 * before proceeding with dangerous or important actions.
 */

import { EventEmitter } from "events";

export type InterruptType =
    | "confirmation"      // User must confirm to proceed
    | "choice"            // User must select from options
    | "input"             // User must provide additional input
    | "approval";         // User must approve an action

export interface InterruptRequest {
    id: string;
    type: InterruptType;
    title: string;
    description: string;
    toolName?: string;
    payload?: Record<string, unknown>;
    options?: string[];  // For choice type interrupts
    severity: "low" | "medium" | "high" | "critical";
    timestamp: number;
    status: "pending" | "approved" | "denied" | "modified";
    response?: string;
    modifiedPayload?: Record<string, unknown>;
}

export interface InterruptHandler {
    (request: InterruptRequest): Promise<InterruptResponse>;
}

export interface InterruptResponse {
    approved: boolean;
    response?: string;
    modifiedPayload?: Record<string, unknown>;
}

/**
 * Dangerous tool keywords that should trigger interrupts
 */
const DANGEROUS_KEYWORDS = [
    "delete", "remove", "destroy", "drop", "truncate",
    "exec", "execute", "shell", "bash", "cmd",
    "sudo", "root", "admin",
    "file_write", "file_delete", "http_request",
    "send_message", "email", "webhook",
    "database_write", "database_delete",
    "smart_home", "lock", "unlock", "camera",
    "payment", "transfer", "transaction",
];

/**
 * High-severity tool keywords
 */
const HIGH_SEVERITY_KEYWORDS = [
    "code", "programming", "script",
    "research", "deep_research",
    "system", "config", "settings",
    "memory", "forget", "update_fact",
];

export class InterruptManager extends EventEmitter {
    private pendingInterrupts: Map<string, InterruptRequest> = new Map();
    private handlers: Map<InterruptType, InterruptHandler> = new Map();
    private defaultHandler?: InterruptHandler;
    private autoApproveLowRisk: boolean = false;
    private userId: string = "default";

    constructor() {
        super();
        this.setupDefaultHandlers();
    }

    /**
     * Set the current user ID for interrupt context
     */
    setUserId(userId: string): void {
        this.userId = userId;
    }

    /**
     * Enable or disable auto-approval for low-risk actions
     */
    setAutoApproveLowRisk(enabled: boolean): void {
        this.autoApproveLowRisk = enabled;
    }

    /**
     * Register a custom handler for a specific interrupt type
     */
    registerHandler(type: InterruptType, handler: InterruptHandler): void {
        this.handlers.set(type, handler);
    }

    /**
     * Set a default handler for all interrupt types
     */
    setDefaultHandler(handler: InterruptHandler): void {
        this.defaultHandler = handler;
    }

    /**
     * Check if a tool should trigger an interrupt
     */
    shouldInterrupt(toolName: string, payload?: Record<string, unknown>): {
        shouldInterrupt: boolean;
        severity: "low" | "medium" | "high" | "critical";
        reason: string;
    } {
        const toolLower = toolName.toLowerCase();

        // Check for dangerous operations
        for (const keyword of DANGEROUS_KEYWORDS) {
            if (toolLower.includes(keyword)) {
                return {
                    shouldInterrupt: true,
                    severity: "critical",
                    reason: `Tool '${toolName}' contains dangerous keyword: ${keyword}`
                };
            }
        }

        // Check for high-severity operations
        for (const keyword of HIGH_SEVERITY_KEYWORDS) {
            if (toolLower.includes(keyword)) {
                return {
                    shouldInterrupt: true,
                    severity: "high",
                    reason: `Tool '${toolName}' contains high-severity keyword: ${keyword}`
                };
            }
        }

        // Check payload for sensitive data patterns
        if (payload) {
            const payloadStr = JSON.stringify(payload).toLowerCase();
            if (payloadStr.includes("password") ||
                payloadStr.includes("api_key") ||
                payloadStr.includes("secret") ||
                payloadStr.includes("token")) {
                return {
                    shouldInterrupt: true,
                    severity: "high",
                    reason: "Tool payload contains sensitive data"
                };
            }
        }

        // Default: low severity, no interrupt needed unless configured
        return {
            shouldInterrupt: false,
            severity: "low",
            reason: "Tool appears safe"
        };
    }

    /**
     * Create and emit an interrupt request
     */
    async requestInterrupt(
        toolName: string,
        payload: Record<string, unknown>,
        type: InterruptType = "confirmation",
        description?: string
    ): Promise<InterruptResponse> {
        const { shouldInterrupt, severity, reason } = this.shouldInterrupt(toolName, payload);

        // Auto-approve low-risk if enabled
        if (!shouldInterrupt && this.autoApproveLowRisk) {
            return { approved: true };
        }

        // Skip interrupt if not needed
        if (!shouldInterrupt) {
            return { approved: true };
        }

        const interrupt: InterruptRequest = {
            id: `interrupt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            title: this.getInterruptTitle(toolName),
            description: description || reason,
            toolName,
            payload,
            severity,
            timestamp: Date.now(),
            status: "pending"
        };

        console.log(`⚠️ [INTERRUPT] ${severity.toUpperCase()}: ${interrupt.title}`);
        console.log(`   Description: ${interrupt.description}`);
        if (payload) {
            console.log(`   Payload: ${JSON.stringify(payload).slice(0, 200)}`);
        }

        // Store the interrupt
        this.pendingInterrupts.set(interrupt.id, interrupt);

        // Emit event for external listeners (e.g., UI)
        this.emit("interrupt", interrupt);

        // Get the appropriate handler
        const handler = this.handlers.get(type) || this.defaultHandler;

        if (handler) {
            try {
                const response = await handler(interrupt);
                this.updateInterruptStatus(interrupt.id, response);
                return response;
            } catch (error) {
                console.error("❌ Interrupt handler error:", error);
                // Default to deny on handler error
                return { approved: false, response: "Interrupt handler failed" };
            }
        }

        // If no handler, use default response (approve for now, can be configured)
        return { approved: true, response: "No interrupt handler configured" };
    }

    /**
     * Update interrupt status after response
     */
    private updateInterruptStatus(id: string, response: InterruptResponse): void {
        const interrupt = this.pendingInterrupts.get(id);
        if (interrupt) {
            interrupt.status = response.approved ? "approved" : "denied";
            interrupt.response = response.response;
            interrupt.modifiedPayload = response.modifiedPayload;
            this.emit("interruptResolved", interrupt);
        }
    }

    /**
     * Get all pending interrupts
     */
    getPendingInterrupts(): InterruptRequest[] {
        return Array.from(this.pendingInterrupts.values())
            .filter(i => i.status === "pending");
    }

    /**
     * Get interrupt by ID
     */
    getInterrupt(id: string): InterruptRequest | undefined {
        return this.pendingInterrupts.get(id);
    }

    /**
     * Manually resolve an interrupt
     */
    async resolveInterrupt(
        id: string,
        approved: boolean,
        response?: string,
        modifiedPayload?: Record<string, unknown>
    ): Promise<void> {
        const interrupt = this.pendingInterrupts.get(id);
        if (interrupt) {
            interrupt.status = approved ? "approved" : "denied";
            interrupt.response = response;
            interrupt.modifiedPayload = modifiedPayload;
            this.emit("interruptResolved", interrupt);
        }
    }

    /**
     * Clear old resolved interrupts
     */
    clearResolvedInterrupts(maxAgeMs: number = 3600000): void {
        const now = Date.now();
        for (const [id, interrupt] of this.pendingInterrupts) {
            if (interrupt.status !== "pending" &&
                now - interrupt.timestamp > maxAgeMs) {
                this.pendingInterrupts.delete(id);
            }
        }
    }

    /**
     * Get a human-readable title for the interrupt
     */
    private getInterruptTitle(toolName: string): string {
        const titles: Record<string, string> = {
            "shell": "Execute Shell Command",
            "exec": "Execute Command",
            "file_delete": "Delete File",
            "file_write": "Write to File",
            "http_request": "Make HTTP Request",
            "send_message": "Send Message",
            "email": "Send Email",
            "webhook": "Trigger Webhook",
            "smart_home": "Control Smart Home",
            "lock": "Lock/Unlock",
            "memory": "Modify Memory",
            "update_fact": "Update Fact",
            "code": "Execute Code",
            "research": "Perform Research",
            "default": `Execute ${toolName}`
        };

        for (const [key, title] of Object.entries(titles)) {
            if (toolName.toLowerCase().includes(key)) {
                return title;
            }
        }

        return titles["default"];
    }

    /**
     * Setup default interrupt handlers (can be overridden)
     */
    private setupDefaultHandlers(): void {
        // Default confirmation handler - just logs and approves
        this.defaultHandler = async (request: InterruptRequest): Promise<InterruptResponse> => {
            console.log(`   [HIL] Awaiting user ${this.userId} confirmation...`);

            // In a real implementation, this would wait for user input
            // For now, we'll log and return approved
            // The Telegram bot would handle the actual user interaction

            return {
                approved: true,
                response: "Auto-approved in default handler"
            };
        };
    }
}

/**
 * Decorator function to wrap tool execution with interrupt checking
 */
export function withInterruptCheck(
    interruptManager: InterruptManager,
    toolName: string
) {
    return async (payload: Record<string, unknown>): Promise<{
        proceed: boolean;
        payload: Record<string, unknown>;
        response?: string;
    }> => {
        const interruptResult = await interruptManager.requestInterrupt(
            toolName,
            payload,
            "confirmation"
        );

        return {
            proceed: interruptResult.approved,
            payload: interruptResult.modifiedPayload || payload,
            response: interruptResult.response
        };
    };
}

/**
 * Create a tool definition that requires confirmation
 */
export function createInterruptibleTool(
    baseToolDef: any,
    interruptManager: InterruptManager
): any {
    return {
        ...baseToolDef,
        interruptible: true,
        interruptManager
    };
}

// Singleton instance
export const interruptManager = new InterruptManager();
