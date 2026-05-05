import { executeAction, type AgentAction, type AgentConfig, type ToolResult } from "@sandboxed-agent/core";
import { BrowserToolFamily, type BrowserEventEmitter, type BrowserToolAction } from "./tools.js";
import type { BrowserPolicy } from "./policy.js";

export interface CreateBrowserToolExecutorOptions {
  runId: string;
  policy: BrowserPolicy;
  artifactsRootDir: string;
  emit?: BrowserEventEmitter;
}

export function createBrowserToolExecutor(options: CreateBrowserToolExecutorOptions): {
  execute: (action: AgentAction, config: AgentConfig) => Promise<ToolResult>;
} {
  const family = new BrowserToolFamily({
    runId: options.runId,
    policy: options.policy,
    artifactsRootDir: options.artifactsRootDir,
    emit: options.emit
  });

  return {
    async execute(action: AgentAction, config: AgentConfig): Promise<ToolResult> {
      if (action.tool.startsWith("browser_")) {
        return family.execute(action as unknown as BrowserToolAction);
      }

      return executeAction(action, config);
    }
  };
}

