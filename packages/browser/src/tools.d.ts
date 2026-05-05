import type { ToolResult } from "@sandboxed-agent/core";
import { type BrowserPolicy } from "./policy.js";
export type BrowserToolName = "browser_open" | "browser_goto" | "browser_click" | "browser_type" | "browser_wait_for" | "browser_extract_text" | "browser_screenshot" | "browser_close";
export type BrowserToolAction = {
    tool: "browser_open";
    input: {
        headless?: boolean;
    };
} | {
    tool: "browser_goto";
    input: {
        url: string;
    };
} | {
    tool: "browser_click";
    input: {
        selector: string;
        strict?: boolean;
    };
} | {
    tool: "browser_type";
    input: {
        selector: string;
        text: string;
        clear?: boolean;
    };
} | {
    tool: "browser_wait_for";
    input: {
        selector: string;
        state?: "attached" | "visible" | "hidden" | "detached";
        timeoutMs?: number;
    };
} | {
    tool: "browser_extract_text";
    input: {
        selector: string;
        maxChars?: number;
    };
} | {
    tool: "browser_screenshot";
    input: {
        name?: string;
        fullPage?: boolean;
    };
} | {
    tool: "browser_close";
    input: Record<string, never>;
};
export type BrowserEventEmitter = (event: {
    type: "browser_session_started" | "browser_navigated" | "browser_action_performed" | "browser_artifact_created" | "browser_session_closed";
    runId: string;
    timestamp: string;
    data?: unknown;
}) => void;
export interface BrowserToolFamilyOptions {
    runId: string;
    policy: BrowserPolicy;
    artifactsRootDir: string;
    emit?: BrowserEventEmitter;
}
export declare class BrowserToolFamily {
    private readonly options;
    private controller;
    constructor(options: BrowserToolFamilyOptions);
    private ensureEnabled;
    private emit;
    private getController;
    execute(action: BrowserToolAction): Promise<ToolResult>;
}
//# sourceMappingURL=tools.d.ts.map