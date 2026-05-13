import { AGENT_DECISION_JSON_SCHEMA } from "./agent-decision-json-schema.js";
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
    notes: "Local HTTP adapter using Ollama /api/generate with structured JSON (schema) and json fallback."
  };

  constructor(private readonly options: OllamaProviderOptions) {
    super();
  }

  private async postGenerate(prompt: string, format: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    return fetch(`${this.options.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.options.model,
        prompt,
        stream: false,
        format
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
  }

  protected async requestDecision(prompt: string): Promise<unknown> {
    let response = await this.postGenerate(prompt, AGENT_DECISION_JSON_SCHEMA);

    if (!response.ok) {
      response = await this.postGenerate(prompt, "json");
    }

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
