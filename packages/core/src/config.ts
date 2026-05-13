import type { ProviderKind } from "./types.js";

export type ProviderConfig = MockConfig | OllamaConfig | OpenAiCompatibleConfig;

export interface AgentRuntimeConfig {
  provider: ProviderConfig;
}

export interface MockConfig {
  kind: "mock";
}

export interface OllamaConfig {
  kind: "ollama";
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface OpenAiCompatibleConfig {
  kind: "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

function readInt(env: Record<string, string | undefined>, key: string): number | undefined {
  const raw = env[key];
  if (!raw) {
    return undefined;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

function pickProviderKind(env: Record<string, string | undefined>): ProviderKind {
  const raw = env.AGENT_PROVIDER?.trim() ?? env.PROVIDER?.trim();
  if (!raw) {
    return "mock";
  }

  if (raw === "mock" || raw === "ollama" || raw === "openai-compatible" || raw === "gemini") {
    return raw;
  }

  return "mock";
}

/**
 * Builds a full provider config for the given kind using the same env defaults as
 * {@link loadRuntimeConfigFromEnv}. Use this when the UI (or CLI flag) selects a provider
 * independently of `AGENT_PROVIDER`.
 */
export function buildProviderConfigForKind(
  kind: ProviderKind,
  env: Record<string, string | undefined> = process.env
): ProviderConfig {
  if (kind === "mock") {
    return { kind: "mock" };
  }

  if (kind === "ollama") {
    return {
      kind: "ollama",
      baseUrl: env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
      model: env.OLLAMA_MODEL ?? "llama3.1",
      timeoutMs: readInt(env, "OLLAMA_TIMEOUT_MS") ?? 120_000
    };
  }

  if (kind === "openai-compatible") {
    return {
      kind: "openai-compatible",
      baseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: env.OPENAI_API_KEY ?? "",
      model: env.OPENAI_MODEL ?? "gpt-4o-mini",
      timeoutMs: readInt(env, "OPENAI_TIMEOUT_MS") ?? 30_000
    };
  }

  if (kind === "gemini") {
    return {
      kind: "openai-compatible",
      baseUrl:
        env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: env.GEMINI_API_KEY ?? "",
      model: env.GEMINI_MODEL ?? "gemini-2.0-flash",
      timeoutMs:
        readInt(env, "GEMINI_TIMEOUT_MS") ?? readInt(env, "OPENAI_TIMEOUT_MS") ?? 120_000
    };
  }

  const exhaustive: never = kind;
  throw new Error(`Unsupported provider kind: ${String(exhaustive)}`);
}

export function loadRuntimeConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): AgentRuntimeConfig {
  const kind = pickProviderKind(env);
  return {
    provider: buildProviderConfigForKind(kind, env)
  };
}

export function validateRuntimeConfig(config: AgentRuntimeConfig): AgentRuntimeConfig {
  const kind = config.provider.kind;

  if (kind === "mock") {
    return config;
  }

  if (kind === "ollama") {
    if (!config.provider.baseUrl) {
      throw new Error("OLLAMA_BASE_URL is required for ollama provider mode.");
    }
    if (!config.provider.model) {
      throw new Error("OLLAMA_MODEL is required for ollama provider mode.");
    }
    if (!Number.isFinite(config.provider.timeoutMs) || config.provider.timeoutMs <= 0) {
      throw new Error("OLLAMA_TIMEOUT_MS must be a positive integer (milliseconds).");
    }
    return config;
  }

  if (kind === "openai-compatible") {
    if (!config.provider.baseUrl) {
      throw new Error(
        "Provider baseUrl is empty (set OPENAI_BASE_URL, or GEMINI_BASE_URL when using Gemini)."
      );
    }
    if (!config.provider.apiKey) {
      throw new Error(
        "Provider API key is empty (set OPENAI_API_KEY, or GEMINI_API_KEY when using AGENT_PROVIDER=gemini)."
      );
    }
    if (!config.provider.model) {
      throw new Error(
        "Provider model is empty (set OPENAI_MODEL, or GEMINI_MODEL when using AGENT_PROVIDER=gemini)."
      );
    }
    if (!Number.isFinite(config.provider.timeoutMs) || config.provider.timeoutMs <= 0) {
      throw new Error(
        "HTTP provider timeout must be a positive integer in milliseconds (OPENAI_TIMEOUT_MS or GEMINI_TIMEOUT_MS)."
      );
    }
    return config;
  }

  const exhaustiveCheck: never = kind;
  throw new Error(`Unsupported provider kind: ${String(exhaustiveCheck)}`);
}
