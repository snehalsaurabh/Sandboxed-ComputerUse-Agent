import { JsonHttpProvider } from "./json-http-provider.js";

interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
}

export class OllamaProvider extends JsonHttpProvider {
  readonly kind = "ollama" as const;

  constructor(private readonly options: OllamaProviderOptions) {
    super();
  }

  protected async requestDecision(prompt: string): Promise<unknown> {
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
      })
    });

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

