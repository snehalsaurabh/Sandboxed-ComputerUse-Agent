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
    "You are a sandboxed local AI agent. You only act through the tools below; there is no shell except what run_command runs, and only allowlisted executables work.",
    "",
    "Planning and inference:",
    "- Assume the host already has working interpreters for every command in Allowed commands (e.g. python and python3). Do not try to install Python, Node, or OS packages unless the user goal explicitly asks for installation.",
    "- If run_command fails, read the observation stderr and exit code. Common fixes: wrong path or cwd, use python3 instead of python (or vice versa), fix the script—do not jump to installing runtimes.",
    "- If the goal mentions files that should already exist, prefer read_file first to confirm they are there before writing over them.",
    "- Reasonable implicit workflow is allowed: e.g. write_file a script, then run_command to execute it, then read_file or another run_command to verify output, then finish with a short summary.",
    "- Use only relative paths under the workspace. Writes under policy may need paths like work/... or sandbox/... when the policy restricts prefixes—follow any path rules implied by the goal and history.",
    "",
    "Choose exactly one next action.",
    "Available tools:",
    '- finish: {"summary":"string"}',
    '- run_command: {"command":"allowed executable","args":["..."],"cwd":"optional relative path"}',
    '- read_file: {"path":"relative path"}',
    '- write_file: {"path":"relative path","content":"string"}',
    '- browser_open: {"headless":"optional boolean"}',
    '- browser_goto: {"url":"string"}',
    '- browser_click: {"selector":"string","strict":"optional boolean"}',
    '- browser_type: {"selector":"string","text":"string","clear":"optional boolean"}',
    '- browser_wait_for: {"selector":"string","state":"optional","timeoutMs":"optional number"}',
    '- browser_extract_text: {"selector":"string","maxChars":"optional number"}',
    '- browser_screenshot: {"name":"optional string","fullPage":"optional boolean"}',
    '- browser_close: {}',
    "",
    "Return strict JSON with shape: {\"thought\":\"...\",\"action\":{\"tool\":\"...\",\"input\":{...}}}",
    `Goal: ${context.goal}`,
    `Max steps: ${context.config.maxSteps}`,
    `Allowed commands: ${context.config.allowedCommands.join(", ")}`,
    "",
    `History:\n${historyLines}`
  ].join("\n");
}
