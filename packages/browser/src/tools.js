import path from "node:path";
import { isOriginAllowed, isSelectorAllowed } from "./policy.js";
import { BrowserController } from "./controller.js";
export class BrowserToolFamily {
    options;
    controller = null;
    constructor(options) {
        this.options = options;
    }
    ensureEnabled() {
        if (!this.options.policy.enabled) {
            throw new Error("Browser tools are disabled by policy.");
        }
    }
    emit(type, data) {
        this.options.emit?.({
            type,
            runId: this.options.runId,
            timestamp: new Date().toISOString(),
            data
        });
    }
    getController() {
        if (!this.controller) {
            this.controller = new BrowserController({
                runId: this.options.runId,
                artifactsRootDir: this.options.artifactsRootDir,
                policy: this.options.policy
            });
        }
        return this.controller;
    }
    async execute(action) {
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
                const locator = page.locator(sel);
                await locator.click({ strict: action.input.strict ?? true });
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
                const locator = page.locator(sel);
                if (action.input.clear) {
                    await locator.fill("");
                }
                await locator.type(action.input.text);
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
//# sourceMappingURL=tools.js.map