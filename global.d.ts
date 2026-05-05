export {};

import type { AgentEvent, AgentRunSummary, ProviderKind } from "@sandboxed-agent/core";

declare global {
  interface Window {
    agentDesktop: {
      run(goal: string, provider: ProviderKind): Promise<AgentRunSummary>;
      stop(): Promise<{ stopped: boolean }>;
      revealInFolder(targetPath: string): Promise<{ revealed: boolean }>;
      onEvent(listener: (event: AgentEvent) => void): void;
    };
  }
}
