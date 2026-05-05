import { type Page } from "playwright";
import type { BrowserPolicy } from "./policy.js";
export interface BrowserArtifacts {
    rootDir: string;
    screenshotsDir: string;
    downloadsDir: string;
    tracePath: string;
}
export interface BrowserControllerOptions {
    runId: string;
    artifactsRootDir: string;
    policy: BrowserPolicy;
}
export declare class BrowserController {
    private readonly options;
    private browser;
    private context;
    private page;
    readonly artifacts: BrowserArtifacts;
    constructor(options: BrowserControllerOptions);
    open(): Promise<void>;
    getPage(): Page;
    close(): Promise<{
        tracePath?: string;
    }>;
}
//# sourceMappingURL=controller.d.ts.map