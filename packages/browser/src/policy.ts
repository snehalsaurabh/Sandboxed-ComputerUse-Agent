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

/**
 * Lowercase hostname without a leading `www.` so apex and www variants share one allowlist entry.
 */
function canonicalHostname(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

function originsRelaxedMatch(request: URL, candidate: URL): boolean {
  if (request.protocol !== candidate.protocol) {
    return false;
  }
  if (request.port !== candidate.port) {
    return false;
  }
  return canonicalHostname(request.hostname) === canonicalHostname(candidate.hostname);
}

function tryParseOriginEntry(entry: string): URL | undefined {
  const trimmed = entry.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return new URL(trimmed);
  } catch {
    return undefined;
  }
}

export const defaultBrowserPolicy: BrowserPolicy = {
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

export function isOriginAllowed(url: string, policy: BrowserPolicy): { ok: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "Invalid URL." };
  }

  const origin = parsed.origin;
  if (
    policy.denyOrigins?.some((denied) => {
      const deniedUrl = tryParseOriginEntry(denied);
      return deniedUrl ? originsRelaxedMatch(parsed, deniedUrl) : denied === origin;
    })
  ) {
    return { ok: false, reason: `Origin denied by policy: ${origin}` };
  }

  if (policy.navigationMode === "explicit") {
    return { ok: true };
  }

  if (policy.allowedOrigins.length === 0) {
    return { ok: false, reason: "No allowedOrigins configured for browser policy." };
  }

  const matches = policy.allowedOrigins.some((entry) => {
    const allowedUrl = tryParseOriginEntry(entry);
    return allowedUrl !== undefined && originsRelaxedMatch(parsed, allowedUrl);
  });

  if (!matches) {
    return { ok: false, reason: `Origin not allowlisted: ${origin}` };
  }

  return { ok: true };
}

export function isSelectorAllowed(
  selector: string,
  policy: BrowserPolicy
): { ok: boolean; reason?: string } {
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

