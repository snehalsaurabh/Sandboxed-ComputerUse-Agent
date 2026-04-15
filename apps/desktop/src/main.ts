import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProvider, runAgent } from "@sandboxed-agent/core";
import type { AgentEvent, ProviderKind } from "@sandboxed-agent/core";

interface RunRequest {
  goal: string;
  provider: ProviderKind;
}

let mainWindow: BrowserWindow | null = null;
const currentDir = path.dirname(fileURLToPath(import.meta.url));

function emitToRenderer(event: AgentEvent): void {
  mainWindow?.webContents.send("agent:event", event);
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(currentDir, "preload.js")
    }
  });

  window.loadURL("data:text/html;charset=utf-8,<html><body><h1>Sandboxed Agent</h1><p>Phase 2 UI shell placeholder.</p></body></html>");
  return window;
}

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  ipcMain.handle("agent:run", async (_event, request: RunRequest) => {
    const provider = createProvider(request.provider, {
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
      ollamaModel: process.env.OLLAMA_MODEL,
      openAiBaseUrl: process.env.OPENAI_BASE_URL,
      openAiApiKey: process.env.OPENAI_API_KEY,
      openAiModel: process.env.OPENAI_MODEL
    });

    return runAgent(request.goal, provider, {}, emitToRenderer);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
