export interface BrowserSelectorRules {
    allowPrefixes: string[];
    denySubstrings: string[];
}
export interface BrowserDownloadsPolicy {
    enabled: boolean;
    allowedExtensions: string[];
    maxBytes: number;
    requireApproval: boolean;
}
export interface BrowserStoragePolicy {
    persist: boolean;
    allowCookies: boolean;
    storageDirMode: "per-run" | "shared";
}
export interface BrowserTimeouts {
    actionTimeoutMs: number;
    navigationTimeoutMs: number;
}
export interface BrowserTracePolicy {
    enabled: boolean;
    screenshots: boolean;
    snapshots: boolean;
}
export interface BrowserPolicy {
    enabled: boolean;
    allowedOrigins: string[];
    denyOrigins?: string[];
    navigationMode: "explicit" | "same-origin" | "allowlisted";
    selectorRules: BrowserSelectorRules;
    downloads: BrowserDownloadsPolicy;
    storage: BrowserStoragePolicy;
    timeouts: BrowserTimeouts;
    headless: boolean;
    trace: BrowserTracePolicy;
}
export declare const defaultBrowserPolicy: BrowserPolicy;
export declare function isOriginAllowed(url: string, policy: BrowserPolicy): {
    ok: boolean;
    reason?: string;
};
export declare function isSelectorAllowed(selector: string, policy: BrowserPolicy): {
    ok: boolean;
    reason?: string;
};
//# sourceMappingURL=policy.d.ts.map