import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
export class BrowserController {
    options;
    browser = null;
    context = null;
    page = null;
    artifacts;
    constructor(options) {
        this.options = options;
        const rootDir = path.resolve(options.artifactsRootDir, options.runId, "browser");
        this.artifacts = {
            rootDir,
            screenshotsDir: path.join(rootDir, "screenshots"),
            downloadsDir: path.join(rootDir, "downloads"),
            tracePath: path.join(rootDir, "trace.zip")
        };
    }
    async open() {
        if (this.browser) {
            return;
        }
        await fs.mkdir(this.artifacts.screenshotsDir, { recursive: true });
        if (this.options.policy.downloads.enabled) {
            await fs.mkdir(this.artifacts.downloadsDir, { recursive: true });
        }
        this.browser = await chromium.launch({ headless: this.options.policy.headless });
        this.context = await this.browser.newContext({
            acceptDownloads: this.options.policy.downloads.enabled
        });
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(this.options.policy.timeouts.actionTimeoutMs);
        this.page.setDefaultNavigationTimeout(this.options.policy.timeouts.navigationTimeoutMs);
        if (this.options.policy.trace.enabled) {
            await this.context.tracing.start({
                screenshots: this.options.policy.trace.screenshots,
                snapshots: this.options.policy.trace.snapshots,
                sources: false
            });
        }
    }
    getPage() {
        if (!this.page) {
            throw new Error("Browser session is not open.");
        }
        return this.page;
    }
    async close() {
        if (!this.browser || !this.context) {
            return {};
        }
        const tracePath = this.options.policy.trace.enabled ? this.artifacts.tracePath : undefined;
        if (tracePath) {
            await fs.mkdir(path.dirname(tracePath), { recursive: true });
            await this.context.tracing.stop({ path: tracePath });
        }
        await this.context.close();
        await this.browser.close();
        this.page = null;
        this.context = null;
        this.browser = null;
        return tracePath ? { tracePath } : {};
    }
}
//# sourceMappingURL=controller.js.map