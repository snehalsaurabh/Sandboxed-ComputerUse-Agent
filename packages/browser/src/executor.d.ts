import { type AgentAction, type AgentConfig, type ToolResult } from "@sandboxed-agent/core";
import { type BrowserEventEmitter } from "./tools.js";
import type { BrowserPolicy } from "./policy.js";
export interface CreateBrowserToolExecutorOptions {
    runId: string;
    policy: BrowserPolicy;
    artifactsRootDir: string;
    emit?: BrowserEventEmitter;
}
export declare function createBrowserToolExecutor(options: CreateBrowserToolExecutorOptions): {
    execute: (action: AgentAction, config: AgentConfig) => Promise<ToolResult>;
};
//# sourceMappingURL=executor.d.ts.map