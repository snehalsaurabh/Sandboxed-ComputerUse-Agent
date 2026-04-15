import { JsonHttpProvider } from "./json-http-provider.js";

interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAiCompatibleProvider extends JsonHttpProvider {
  readonly kind = "openai-compatible" as const;

  constructor(private readonly options: OpenAiCompatibleProviderOptions) {
    super();
  }

  protected async requestDecision(prompt: string): Promise<unknown> {
    const response = await fetch(`${this.options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          {
            role: "system",
            content: "Return strict JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_object"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI-compatible endpoint returned no message content.");
    }

    return JSON.parse(content);
  }
}

