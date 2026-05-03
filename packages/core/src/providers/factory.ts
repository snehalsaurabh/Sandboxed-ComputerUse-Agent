import { MockProvider } from "./mock-provider.js";
import { OllamaProvider } from "./ollama-provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider.js";
import { validateRuntimeConfig, type ProviderConfig } from "../config.js";
import type { ModelProvider, ProviderFactoryOptions, ProviderKind } from "../types.js";

export function createProviderFromConfig(config: ProviderConfig): ModelProvider {
  const validated = validateRuntimeConfig({ provider: config }).provider;

  switch (validated.kind) {
    case "mock":
      return new MockProvider();
    case "ollama":
      return new OllamaProvider({
        baseUrl: validated.baseUrl,
        model: validated.model,
        timeoutMs: validated.timeoutMs
      });
    case "openai-compatible":
      return new OpenAiCompatibleProvider({
        baseUrl: validated.baseUrl,
        apiKey: validated.apiKey,
        model: validated.model,
        timeoutMs: validated.timeoutMs
      });
    default: {
      const exhaustiveCheck: never = validated;
      throw new Error(`Unsupported provider config: ${String(exhaustiveCheck)}`);
    }
  }
}

export function createProvider(
  kind: ProviderKind,
  options: ProviderFactoryOptions = {}
): ModelProvider {
  const config: ProviderConfig =
    kind === "mock"
      ? { kind: "mock" }
      : kind === "ollama"
        ? {
            kind: "ollama",
            baseUrl: options.ollamaBaseUrl ?? "http://127.0.0.1:11434",
            model: options.ollamaModel ?? "llama3.1",
            timeoutMs: 30_000
          }
        : {
            kind: "openai-compatible",
            baseUrl: options.openAiBaseUrl ?? "https://api.openai.com/v1",
            apiKey: options.openAiApiKey ?? "",
            model: options.openAiModel ?? "gpt-4o-mini",
            timeoutMs: 30_000
          };

  return createProviderFromConfig(config);
}
