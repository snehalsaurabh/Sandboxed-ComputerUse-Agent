/**
 * JSON Schema for Ollama `/api/generate` `format` (structured outputs).
 * Matches {@link AgentDecision}: `{ thought, action: { tool, input } }`.
 * Requires Ollama with structured-output support (see Ollama generate API docs).
 */
export const AGENT_DECISION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    thought: { type: "string" },
    action: {
      type: "object",
      additionalProperties: false,
      properties: {
        tool: { type: "string" },
        input: {
          type: "object",
          additionalProperties: true
        }
      },
      required: ["tool", "input"]
    }
  },
  required: ["thought", "action"]
} as const;
