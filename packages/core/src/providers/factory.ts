import { MockProvider } from "./mock-provider.js";
import { OllamaProvider } from "./ollama-provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider.js";
import type { ModelProvider, ProviderFactoryOptions, ProviderKind } from "../types.js";

export function createProvider(
  kind: ProviderKind,
  options: ProviderFactoryOptions = {}
): ModelProvider {
  switch (kind) {
    case "mock":
      return new MockProvider();
    case "ollama":
      return new OllamaProvider({
        baseUrl: options.ollamaBaseUrl ?? "http://127.0.0.1:11434",
        model: options.ollamaModel ?? "llama3.1"
      });
    case "openai-compatible":
      if (!options.openAiApiKey) {
        throw new Error("OPENAI_API_KEY is required for openai-compatible provider mode.");
      }

      return new OpenAiCompatibleProvider({
        baseUrl: options.openAiBaseUrl ?? "https://api.openai.com/v1",
        apiKey: options.openAiApiKey,
        model: options.openAiModel ?? "gpt-4o-mini"
      });
    default:
      throw new Error(`Unsupported provider kind: ${String(kind)}`);
  }
}
