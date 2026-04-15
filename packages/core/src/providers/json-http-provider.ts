import { buildProviderPrompt } from "../provider-prompt.js";
import type {
  AgentDecision,
  AgentStepContext,
  ModelProvider,
  ProviderKind
} from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateDecision(value: unknown): AgentDecision {
  if (
    !isRecord(value) ||
    typeof value.thought !== "string" ||
    !isRecord(value.action) ||
    typeof value.action.tool !== "string" ||
    !isRecord(value.action.input)
  ) {
    throw new Error("Provider response was not a valid AgentDecision object.");
  }

  return value as unknown as AgentDecision;
}

export abstract class JsonHttpProvider implements ModelProvider {
  abstract readonly kind: ProviderKind;

  protected abstract requestDecision(prompt: string): Promise<unknown>;

  async decide(context: AgentStepContext): Promise<AgentDecision> {
    const prompt = buildProviderPrompt(context);
    const raw = await this.requestDecision(prompt);
    return validateDecision(raw);
  }
}
