import type { AgentStepContext } from "./types.js";

export function buildProviderPrompt(context: AgentStepContext): string {
  const historyLines =
    context.history.length === 0
      ? "No previous steps."
      : context.history
          .map((record) =>
            JSON.stringify(
              {
                step: record.step,
                thought: record.thought,
                action: record.action,
                observation: record.observation
              },
              null,
              2
            )
          )
          .join("\n");

  return [
    "You are a sandboxed local AI agent.",
    "Choose exactly one next action.",
    "Available tools:",
    '- finish: {"summary":"string"}',
    '- run_command: {"command":"allowed executable","args":["..."],"cwd":"optional relative path"}',
    '- read_file: {"path":"relative path"}',
    '- write_file: {"path":"relative path","content":"string"}',
    "Respect the workspace boundary and use relative paths.",
    "Return strict JSON with shape: {\"thought\":\"...\",\"action\":{\"tool\":\"...\",\"input\":{...}}}",
    `Goal: ${context.goal}`,
    `Max steps: ${context.config.maxSteps}`,
    `Allowed commands: ${context.config.allowedCommands.join(", ")}`,
    `History:\n${historyLines}`
  ].join("\n");
}

