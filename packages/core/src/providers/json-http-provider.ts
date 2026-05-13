import { buildProviderPrompt } from "../provider-prompt.js";
import type {
  AgentDecision,
  AgentStepContext,
  ModelProvider,
  ProviderCapabilities,
  ProviderKind
} from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function truncate(value: string, max = 500): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function previewUnknown(value: unknown, max = 280): string {
  try {
    const serialized = JSON.stringify(value);
    return serialized.length <= max ? serialized : `${serialized.slice(0, max)}…`;
  } catch {
    return truncate(String(value), max);
  }
}

function validateDecision(value: unknown): AgentDecision {
  if (
    !isRecord(value) ||
    typeof value.thought !== "string" ||
    !isRecord(value.action) ||
    typeof value.action.tool !== "string" ||
    !isRecord(value.action.input)
  ) {
    throw new Error(
      `Provider response was not a valid AgentDecision object. Received: ${previewUnknown(value)}`
    );
  }

  return value as unknown as AgentDecision;
}

export abstract class JsonHttpProvider implements ModelProvider {
  abstract readonly kind: ProviderKind;
  abstract readonly capabilities: ProviderCapabilities;

  protected abstract requestDecision(prompt: string): Promise<unknown>;

  async decide(context: AgentStepContext): Promise<AgentDecision> {
    const prompt = buildProviderPrompt(context);
    try {
      const raw = await this.requestDecision(prompt);
      return validateDecision(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error.";
      throw new Error(`[${this.kind}] ${truncate(message)}`);
    }
  }
}
