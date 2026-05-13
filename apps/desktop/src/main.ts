import { app, BrowserWindow, ipcMain } from "electron";
import { shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProviderConfigForKind,
  createProviderFromConfig,
  loadWorkspaceEnv,
  runAgent,
  validateRuntimeConfig,
  type AgentEvent,
  type AgentRunSummary,
  type ProviderKind
} from "@sandboxed-agent/core";
import { createBrowserToolExecutor, defaultBrowserPolicy } from "@sandboxed-agent/browser";

interface RunRequest {
  goal: string;
  provider: ProviderKind;
}

loadWorkspaceEnv();

let mainWindow: BrowserWindow | null = null;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, "..");
let currentRunAbortController: AbortController | null = null;
let currentRunPromise: Promise<AgentRunSummary> | null = null;

function emitToRenderer(event: AgentEvent): void {
  mainWindow?.webContents.send("agent:event", event);
}

function browserPolicyFromEnv(): typeof defaultBrowserPolicy {
  const enabled = process.env.BROWSER_ENABLED === "1" || process.env.BROWSER_ENABLED === "true";
  const allowedOrigins = (process.env.BROWSER_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return {
    ...defaultBrowserPolicy,
    enabled,
    allowedOrigins
  };
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
      preload: path.join(currentDir, "preload.js"),
      // Default `sandbox: true` runs the preload in a restricted context where ESM
      // `import` often fails; then `contextBridge` never runs and the renderer has no
      // `window.agentDesktop` (Start appears to do nothing). Match typical dev-desktop setups.
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
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
      const merged = validateRuntimeConfig({
        provider: buildProviderConfigForKind(request.provider, process.env)
      });
      const provider = createProviderFromConfig(merged.provider);

      const browserPolicy = browserPolicyFromEnv();
      const artifactsRootDir = process.env.AGENT_AUDIT_DIR ?? path.resolve(process.cwd(), ".agent-runs");
      const browserExecutor = createBrowserToolExecutor({
        runId,
        policy: browserPolicy,
        artifactsRootDir,
        emit: (evt) => emitToRenderer(evt as unknown as AgentEvent)
      });

      currentRunPromise = runAgent(request.goal, provider, {}, {
        signal: currentRunAbortController.signal,
        onEvent: emitToRenderer,
        runId,
        toolExecutor: browserExecutor.execute
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

  ipcMain.handle("agent:revealInFolder", async (_event, targetPath: string) => {
    if (!targetPath) {
      return { revealed: false };
    }

    shell.showItemInFolder(targetPath);
    return { revealed: true };
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
