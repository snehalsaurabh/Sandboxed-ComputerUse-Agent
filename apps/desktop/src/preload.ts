import { contextBridge, ipcRenderer } from "electron";
import type { AgentEvent, AgentRunSummary, ProviderKind } from "@sandboxed-agent/core";

contextBridge.exposeInMainWorld("agentDesktop", {
  run(goal: string, provider: ProviderKind): Promise<AgentRunSummary> {
    return ipcRenderer.invoke("agent:run", { goal, provider });
  },
  onEvent(listener: (event: AgentEvent) => void): void {
    ipcRenderer.on("agent:event", (_ipcEvent, payload: AgentEvent) => {
      listener(payload);
    });
  }
});
