import path from "node:path";
import type { ToolResult } from "@sandboxed-agent/core";
import { isOriginAllowed, isSelectorAllowed, type BrowserPolicy } from "./policy.js";
import { BrowserController } from "./controller.js";

export type BrowserToolName =
  | "browser_open"
  | "browser_goto"
  | "browser_click"
  | "browser_type"
  | "browser_wait_for"
  | "browser_extract_text"
  | "browser_screenshot"
  | "browser_close";

export type BrowserToolAction =
  | { tool: "browser_open"; input: { headless?: boolean } }
  | { tool: "browser_goto"; input: { url: string } }
  | { tool: "browser_click"; input: { selector: string; strict?: boolean } }
  | { tool: "browser_type"; input: { selector: string; text: string; clear?: boolean } }
  | {
      tool: "browser_wait_for";
      input: {
        selector: string;
        state?: "attached" | "visible" | "hidden" | "detached";
        timeoutMs?: number;
      };
    }
  | { tool: "browser_extract_text"; input: { selector: string; maxChars?: number } }
  | { tool: "browser_screenshot"; input: { name?: string; fullPage?: boolean } }
  | { tool: "browser_close"; input: Record<string, never> };

export type BrowserEventEmitter = (event: {
  type: BrowserEventType;
  runId: string;
  timestamp: string;
  data?: unknown;
}) => void;

export type BrowserEventType =
  | "browser_session_started"
  | "browser_navigated"
  | "browser_action_performed"
  | "browser_artifact_created"
  | "browser_session_closed";

export interface BrowserToolFamilyOptions {
  runId: string;
  policy: BrowserPolicy;
  artifactsRootDir: string;
  emit?: BrowserEventEmitter;
}

export class BrowserToolFamily {
  private controller: BrowserController | null = null;

  constructor(private readonly options: BrowserToolFamilyOptions) {}

  private ensureEnabled(): void {
    if (!this.options.policy.enabled) {
      throw new Error("Browser tools are disabled by policy.");
    }
  }

  private emit(type: BrowserEventType, data?: unknown): void {
    this.options.emit?.({
      type,
      runId: this.options.runId,
      timestamp: new Date().toISOString(),
      data
    });
  }


  private getController(): BrowserController {
    if (!this.controller) {
      this.controller = new BrowserController({
        runId: this.options.runId,
        artifactsRootDir: this.options.artifactsRootDir,
        policy: this.options.policy
      });
    }
    return this.controller;
  }

  async execute(action: BrowserToolAction): Promise<ToolResult> {
    this.ensureEnabled();

    switch (action.tool) {
      case "browser_open": {
        if (typeof action.input.headless === "boolean") {
          this.options.policy.headless = action.input.headless;
        }
        await this.getController().open();
        this.emit("browser_session_started", { headless: this.options.policy.headless });
        return { ok: true, message: "Browser session opened." };
      }
      case "browser_goto": {
        const check = isOriginAllowed(action.input.url, this.options.policy);
        if (!check.ok) {
          return { ok: false, message: check.reason ?? "Navigation blocked by policy." };
        }
        const page = this.getController().getPage();
        await page.goto(action.input.url);
        this.emit("browser_navigated", { url: page.url() });
        return { ok: true, message: "Navigated.", data: { url: page.url() } };
      }
      case "browser_click": {
        const sel = action.input.selector;
        const check = isSelectorAllowed(sel, this.options.policy);
        if (!check.ok) {
          return { ok: false, message: check.reason ?? "Selector blocked by policy." };
        }
        const page = this.getController().getPage();
        await page.click(sel, { strict: action.input.strict ?? true });
        this.emit("browser_action_performed", { action: "click", selector: sel });
        return { ok: true, message: "Clicked.", data: { selector: sel } };
      }
      case "browser_type": {
        const sel = action.input.selector;
        const check = isSelectorAllowed(sel, this.options.policy);
        if (!check.ok) {
          return { ok: false, message: check.reason ?? "Selector blocked by policy." };
        }
        const page = this.getController().getPage();
        if (action.input.clear) {
          await page.fill(sel, "", { strict: true });
        }
        await page.type(sel, action.input.text, { strict: true });
        this.emit("browser_action_performed", { action: "type", selector: sel });
        return { ok: true, message: "Typed.", data: { selector: sel } };
      }
      case "browser_wait_for": {
        const sel = action.input.selector;
        const check = isSelectorAllowed(sel, this.options.policy);
        if (!check.ok) {
          return { ok: false, message: check.reason ?? "Selector blocked by policy." };
        }
        const page = this.getController().getPage();
        await page.waitForSelector(sel, {
          state: action.input.state ?? "visible",
          timeout: action.input.timeoutMs
        });
        this.emit("browser_action_performed", { action: "wait_for", selector: sel });
        return { ok: true, message: "Wait satisfied.", data: { selector: sel } };
      }
      case "browser_extract_text": {
        const sel = action.input.selector;
        const check = isSelectorAllowed(sel, this.options.policy);
        if (!check.ok) {
          return { ok: false, message: check.reason ?? "Selector blocked by policy." };
        }
        const page = this.getController().getPage();
        const text = await page.locator(sel).innerText();
        const max = action.input.maxChars ?? 10_000;
        const truncated = text.length > max ? `${text.slice(0, max)}…` : text;
        this.emit("browser_action_performed", { action: "extract_text", selector: sel });
        return { ok: true, message: "Extracted text.", data: { selector: sel, text: truncated } };
      }
      case "browser_screenshot": {
        const page = this.getController().getPage();
        const name = (action.input.name ?? `shot-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, "_");
        const file = `${name}.png`;
        const abs = path.join(this.getController().artifacts.screenshotsDir, file);
        await page.screenshot({ path: abs, fullPage: action.input.fullPage ?? false });
        this.emit("browser_artifact_created", { kind: "screenshot", path: abs });
        return { ok: true, message: "Screenshot captured.", data: { path: abs } };
      }
      case "browser_close": {
        const closed = await this.getController().close();
        this.emit("browser_session_closed", closed);
        if (closed.tracePath) {
          this.emit("browser_artifact_created", { kind: "trace", path: closed.tracePath });
        }
        return { ok: true, message: "Browser session closed.", data: closed };
      }
      default: {
        return { ok: false, message: "Unknown browser tool." };
      }
    }
  }
}

