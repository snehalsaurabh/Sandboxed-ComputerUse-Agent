import { JsonHttpProvider } from "./json-http-provider.js";
import type { ProviderCapabilities } from "../types.js";

interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export class OllamaProvider extends JsonHttpProvider {
  readonly kind = "ollama" as const;
  readonly capabilities: ProviderCapabilities = {
    strictJson: true,
    streaming: false,
    toolUse: "json",
    notes: "Local HTTP adapter using Ollama /api/generate with JSON format."
  };

  constructor(private readonly options: OllamaProviderOptions) {
    super();
  }

  protected async requestDecision(prompt: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    const response = await fetch(`${this.options.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.options.model,
        prompt,
        stream: false,
        format: "json"
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { response?: string };
    if (!payload.response) {
      throw new Error("Ollama did not return a response payload.");
    }

    return JSON.parse(payload.response);
  }
}

