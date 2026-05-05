export const defaultBrowserPolicy = {
    enabled: false,
    allowedOrigins: [],
    denyOrigins: [],
    navigationMode: "allowlisted",
    selectorRules: {
        allowPrefixes: ["#", ".", "[data-testid=", "[aria-label="],
        denySubstrings: ["iframe", ":has-text(", "script", "style"]
    },
    downloads: {
        enabled: false,
        allowedExtensions: [".txt", ".png", ".jpg", ".jpeg", ".pdf"],
        maxBytes: 10_000_000,
        requireApproval: true
    },
    storage: {
        persist: false,
        allowCookies: false,
        storageDirMode: "per-run"
    },
    timeouts: {
        actionTimeoutMs: 10_000,
        navigationTimeoutMs: 20_000
    },
    headless: true,
    trace: {
        enabled: true,
        screenshots: true,
        snapshots: true
    }
};
export function isOriginAllowed(url, policy) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return { ok: false, reason: "Invalid URL." };
    }
    const origin = parsed.origin;
    if (policy.denyOrigins?.includes(origin)) {
        return { ok: false, reason: `Origin denied by policy: ${origin}` };
    }
    if (policy.navigationMode === "explicit") {
        return { ok: true };
    }
    if (policy.allowedOrigins.length === 0) {
        return { ok: false, reason: "No allowedOrigins configured for browser policy." };
    }
    if (!policy.allowedOrigins.includes(origin)) {
        return { ok: false, reason: `Origin not allowlisted: ${origin}` };
    }
    return { ok: true };
}
export function isSelectorAllowed(selector, policy) {
    const trimmed = selector.trim();
    if (!trimmed) {
        return { ok: false, reason: "Selector is empty." };
    }
    if (policy.selectorRules.denySubstrings.some((item) => trimmed.includes(item))) {
        return { ok: false, reason: "Selector denied by policy." };
    }
    if (!policy.selectorRules.allowPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
        return { ok: false, reason: "Selector prefix not allowlisted by policy." };
    }
    return { ok: true };
}
//# sourceMappingURL=policy.js.map