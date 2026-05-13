/**
 * JSON Schema for Ollama `/api/generate` `format` (structured outputs).
 * Matches {@link AgentDecision}: `{ thought, action: { tool, input } }`.
 * Requires Ollama with structured-output support (see Ollama generate API docs).
 *
 * `action.tool` enum must stay in sync with {@link ToolName} in ../types.ts and the tool list in provider-prompt.ts.
 */
import type { ToolName } from "../types.js";

/** Runtime tool names only—keeps models from emitting edit_file, search_replace, etc. */
export const AGENT_DECISION_TOOL_NAMES: readonly ToolName[] = [
  "run_command",
  "read_file",
  "write_file",
  "finish",
  "browser_open",
  "browser_goto",
  "browser_click",
  "browser_type",
  "browser_wait_for",
  "browser_extract_text",
  "browser_screenshot",
  "browser_close"
] as const satisfies readonly ToolName[];

export const AGENT_DECISION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    thought: { type: "string" },
    action: {
      type: "object",
      additionalProperties: false,
      properties: {
        tool: {
          type: "string",
          enum: [...AGENT_DECISION_TOOL_NAMES]
        },
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
