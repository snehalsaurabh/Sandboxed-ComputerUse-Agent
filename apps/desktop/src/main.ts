import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProviderFromConfig, loadRuntimeConfigFromEnv, runAgent, validateRuntimeConfig } from "@sandboxed-agent/core";
import type { AgentEvent, AgentRunSummary, ProviderKind } from "@sandboxed-agent/core";

interface RunRequest {
  goal: string;
  provider: ProviderKind;
}

let mainWindow: BrowserWindow | null = null;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, "..");
let currentRunAbortController: AbortController | null = null;
let currentRunPromise: Promise<AgentRunSummary> | null = null;

function emitToRenderer(event: AgentEvent): void {
  mainWindow?.webContents.send("agent:event", event);
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1340,
    height: 900,
    minWidth: 1080,
    minHeight: 760,
    backgroundColor: "#edf3ee",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(currentDir, "preload.js")
    }
  });

  window.loadFile(path.join(appRoot, "src", "index.html"));
  return window;
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  ipcMain.handle("agent:run", async (_event, request: RunRequest) => {
    if (currentRunPromise) {
      throw new Error("An agent run is already in progress.");
    }

    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    try {
      currentRunAbortController = new AbortController();
      const baseConfig = loadRuntimeConfigFromEnv(process.env);
      const merged = validateRuntimeConfig({
        provider: {
          ...baseConfig.provider,
          kind: request.provider
        } as typeof baseConfig.provider
      });
      const provider = createProviderFromConfig(merged.provider);

      currentRunPromise = runAgent(request.goal, provider, {}, {
        signal: currentRunAbortController.signal,
        onEvent: emitToRenderer,
        runId
      });

      return await currentRunPromise;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown agent run error.";
      emitToRenderer({
        type: "run_failed",
        runId,
        error: message,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      currentRunAbortController = null;
      currentRunPromise = null;
    }
  });

  ipcMain.handle("agent:stop", async () => {
    if (!currentRunAbortController) {
      return { stopped: false };
    }

    currentRunAbortController.abort();
    return { stopped: true };
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
