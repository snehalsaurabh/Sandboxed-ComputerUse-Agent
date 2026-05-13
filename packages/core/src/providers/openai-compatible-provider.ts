import { JsonHttpProvider } from "./json-http-provider.js";
import type { ProviderCapabilities } from "../types.js";

interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

function normalizeOpenAiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  // Gemini's OpenAI-compatible REST API uses .../v1beta/openai/chat/completions (no extra /v1 segment).
  if (/generativelanguage\.googleapis\.com\/v1beta\/openai/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export class OpenAiCompatibleProvider extends JsonHttpProvider {
  readonly kind = "openai-compatible" as const;
  readonly capabilities: ProviderCapabilities = {
    strictJson: true,
    streaming: false,
    toolUse: "json",
    notes: "OpenAI-style /v1/chat/completions adapter using response_format=json_object."
  };

  constructor(private readonly options: OpenAiCompatibleProviderOptions) {
    super();
  }

  protected async requestDecision(prompt: string): Promise<unknown> {
    const baseUrl = normalizeOpenAiBaseUrl(this.options.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    const response = await fetch(`${baseUrl}/chat/completions`, {
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
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const hint =
        response.status === 401 || response.status === 403
          ? "Check OPENAI_API_KEY."
          : response.status === 404
            ? "Check OPENAI_BASE_URL (expected OpenAI-style /v1 endpoints)."
            : "Check OPENAI_BASE_URL and network connectivity.";
      throw new Error(`OpenAI-compatible request failed with status ${response.status}. ${hint}`);
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

