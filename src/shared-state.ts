/**
 * Shared State Management
 * 
 * Based on CopilotKit's shared state pattern:
 * https://docs.copilotkit.ai/shared-state
 * 
 * Allows agents and UI components to share and synchronize state in real-time.
 */

import { EventEmitter } from "events";

export type StateValue = string | number | boolean | null | StateObject | StateArray;
export interface StateObject { [key: string]: StateValue; }
export type StateArray = StateValue[];

export interface StateEntry {
    key: string;
    value: StateValue;
    timestamp: number;
    source: "agent" | "user" | "system";
    version: number;
}

export interface StateSubscription {
    id: string;
    keys: string[];
    callback: (entry: StateEntry) => void;
    immediate?: boolean;
}

/**
 * Shared State Manager
 * 
 * Provides a synchronized state layer that agents and UI can read/write in real-time.
 */
export class SharedState extends EventEmitter {
    private state: Map<string, StateEntry> = new Map();
    private subscriptions: Map<string, StateSubscription[]> = new Map();
    private version: number = 0;
    private maxHistory: number = 1000;
    private history: StateEntry[] = [];

    constructor() {
        super();
    }

    /**
     * Set a state value
     */
    set(key: string, value: StateValue, source: "agent" | "user" | "system" = "agent"): void {
        const entry: StateEntry = {
            key,
            value,
            timestamp: Date.now(),
            source,
            version: ++this.version
        };

        this.state.set(key, entry);
        this.history.push(entry);

        // Trim history if needed
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }

        // Emit events
        this.emit("change", entry);
        this.emit(`change:${key}`, entry);

        // Notify subscribers
        this.notifySubscribers(key, entry);
    }

    /**
     * Get a state value
     */
    get(key: string, defaultValue?: StateValue): StateValue {
        const entry = this.state.get(key);
        return entry?.value ?? defaultValue ?? null;
    }

    /**
     * Get all state entries
     */
    getAll(): Record<string, StateValue> {
        const result: Record<string, StateValue> = {};
        for (const [key, entry] of this.state) {
            result[key] = entry.value;
        }
        return result;
    }

    /**
     * Get state entry with metadata
     */
    getEntry(key: string): StateEntry | undefined {
        return this.state.get(key);
    }

    /**
     * Delete a state value
     */
    delete(key: string): boolean {
        const existed = this.state.has(key);
        this.state.delete(key);

        if (existed) {
            const entry: StateEntry = {
                key,
                value: null,
                timestamp: Date.now(),
                source: "system",
                version: ++this.version
            };

            this.emit("delete", key);
            this.emit(`delete:${key}`, key);
            this.notifySubscribers(key, entry);
        }

        return existed;
    }

    /**
     * Subscribe to state changes
     */
    subscribe(
        keys: string[],
        callback: (entry: StateEntry) => void,
        immediate: boolean = false
    ): string {
        const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const subscription: StateSubscription = {
            id,
            keys,
            callback,
            immediate
        };

        for (const key of keys) {
            if (!this.subscriptions.has(key)) {
                this.subscriptions.set(key, []);
            }
            this.subscriptions.get(key)!.push(subscription);
        }

        // If immediate is true, send current values
        if (immediate) {
            for (const key of keys) {
                const entry = this.state.get(key);
                if (entry) {
                    callback(entry);
                }
            }
        }

        return id;
    }

    /**
     * Unsubscribe from state changes
     */
    unsubscribe(subscriptionId: string): boolean {
        for (const [key, subs] of this.subscriptions) {
            const index = subs.findIndex(s => s.id === subscriptionId);
            if (index !== -1) {
                subs.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Get state history
     */
    getHistory(key?: string, limit: number = 50): StateEntry[] {
        let history = this.history;

        if (key) {
            history = history.filter(h => h.key === key);
        }

        return history.slice(-limit);
    }

    /**
     * Subscribe to any state changes
     */
    onAny(callback: (entry: StateEntry) => void): void {
        this.on("change", callback);
    }

    /**
     * Wait for a state key to have a specific value
     */
    async waitFor(
        key: string,
        predicate: (value: StateValue) => boolean,
        timeoutMs: number = 30000
    ): Promise<StateEntry> {
        // Check if already matches
        const current = this.state.get(key);
        if (current && predicate(current.value)) {
            return current;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.off(`change:${key}`, handler);
                reject(new Error(`Timeout waiting for ${key}`));
            }, timeoutMs);

            const handler = (entry: StateEntry) => {
                if (predicate(entry.value)) {
                    clearTimeout(timeout);
                    this.off(`change:${key}`, handler);
                    resolve(entry);
                }
            };

            this.on(`change:${key}`, handler);
        });
    }

    /**
     * Subscribe to keypath changes (e.g., "user.name")
     */
    subscribeKeyPath(
        keyPath: string,
        callback: (value: any) => void,
        immediate: boolean = false
    ): () => void {
        const parts = keyPath.split(".");

        const handler = (entry: StateEntry) => {
            let value: any = entry.value;

            // Navigate to the nested value
            for (let i = 1; i < parts.length; i++) {
                if (value && typeof value === "object") {
                    value = value[parts[i]];
                } else {
                    value = undefined;
                    break;
                }
            }

            callback(value);
        };

        // Subscribe to the root key
        const subscriptionId = this.subscribe([parts[0]], handler, immediate);

        // Return unsubscribe function
        return () => this.unsubscribe(subscriptionId);
    }

    /**
     * Update nested state
     */
    updateNested(keyPath: string, updates: StateObject): void {
        const parts = keyPath.split(".");
        const rootKey = parts[0];

        // Get current value
        const current = this.get(rootKey) as StateObject || {};

        // Deep merge
        let currentValue: any = current;
        for (let i = 1; i < parts.length - 1; i++) {
            if (!currentValue[parts[i]]) {
                currentValue[parts[i]] = {};
            }
            currentValue = currentValue[parts[i]];
        }

        // Apply updates
        Object.assign(currentValue, updates);

        // Set the root key
        this.set(rootKey, current);
    }

    /**
     * Get current state as JSON
     */
    toJSON(): string {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * Load state from JSON
     */
    fromJSON(json: string): void {
        try {
            const data = JSON.parse(json);
            for (const [key, value] of Object.entries(data)) {
                this.set(key, value as StateValue, "system");
            }
        } catch (e) {
            console.error("Failed to parse shared state JSON:", e);
        }
    }

    /**
     * Clear all state
     */
    clear(): void {
        this.state.clear();
        this.history = [];
        this.version = 0;
        this.emit("clear");
    }

    /**
     * Notify subscribers for a key
     */
    private notifySubscribers(key: string, entry: StateEntry): void {
        const subs = this.subscriptions.get(key) || [];

        // Also check wildcard subscribers
        const wildcardSubs = this.subscriptions.get("*") || [];

        for (const sub of [...subs, ...wildcardSubs]) {
            if (sub.keys.includes(key)) {
                try {
                    sub.callback(entry);
                } catch (e) {
                    console.error("Subscription callback error:", e);
                }
            }
        }
    }
}

/**
 * Readable state - a state value that can be read by agents
 */
export class ReadableState {
    protected sharedState: SharedState;
    protected key: string;

    constructor(sharedState: SharedState, key: string) {
        this.sharedState = sharedState;
        this.key = key;
    }

    /**
     * Get current value
     */
    read(): StateValue {
        return this.sharedState.get(this.key);
    }

    /**
     * Subscribe to changes
     */
    subscribe(callback: (value: StateValue) => void): () => void {
        const handler = (entry: StateEntry) => callback(entry.value);
        const id = this.sharedState.subscribe([this.key], handler, true);
        return () => this.sharedState.unsubscribe(id);
    }
}

/**
 * Writable state - a state value that can be written by agents
 */
export class WritableState extends ReadableState {
    /**
     * Set a new value
     */
    write(value: StateValue, source: "agent" | "user" | "system" = "agent"): void {
        this.sharedState.set(this.key, value, source);
    }

    /**
     * Update with a function
     */
    update(
        updater: (current: StateValue) => StateValue,
        source: "agent" | "user" | "system" = "agent"
    ): void {
        const current = this.read();
        const updated = updater(current);
        this.write(updated, source);
    }
}

// Singleton instance
export const sharedState = new SharedState();

/**
 * Helper to create a readable/writable state
 */
export function createSharedState(key: string): WritableState {
    return new WritableState(sharedState, key);
}
