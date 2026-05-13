import process from "node:process";
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

  const platformHints =
    process.platform === "win32"
      ? [
          "- Windows: Use command \"python\" (not \"python3\") for scripts unless you already proved \"python3\" works. If stderr mentions the Microsoft Store, app execution aliases, or exit code 9009 with \"python3\", do not use \"python3\" again in this run—use \"python\" with cwd \"work\" and args like [\"sample.py\"].",
          "- Windows: For scripts under work/, set run_command \"cwd\" to \"work\" and use args [\"sample.py\"] (not [\"work/sample.py\"]) so imports and open(\"sample.txt\") resolve. read_file on a missing path returns ENOENT—create files first; do not finish as success until required outputs exist."
        ]
      : [
          "- Unix-like: If \"python\" fails, try \"python3\" with the same arguments; fix cwd if paths are wrong."
        ];

  return [
    "You are a sandboxed local AI agent. You only act through the tools below; there is no shell except what run_command runs, and only allowlisted executables work.",
    "",
    "Planning and inference:",
    "- Assume the host already has working interpreters for every command in Allowed commands. Do not try to install Python, Node, or OS packages unless the user goal explicitly asks for installation.",
    "- There is no edit_file, search_replace, or apply_patch tool. To change a file, use write_file with the complete new file text.",
    "- write_file: input JSON must have exactly two keys, \"path\" and \"content\", both strings. Put the entire file in one \"content\" string—never split source lines into extra JSON keys (that breaks parsing and only the first line is written).",
    "- write_file \"content\" must be raw file text (e.g. raw Python), not an extra JSON-encoded string or object wrapper around the script—do not wrap the script in another `{ \"...\" }` layer beyond the tool JSON itself.",
    "- run_command \"command\" must be a single allowlisted executable name only (e.g. python, node, dir). Wrong: {\"command\":\"python -m ensurepip\"}. Right: {\"command\":\"python\",\"args\":[\"-m\",\"ensurepip\"]}. Put all flags and script paths in \"args\".",
    "- If run_command fails, read stderr and exit code; fix the script, cwd, or interpreter—never claim success in finish if the goal was not achieved.",
    "- After two failures with the same command+args (or the same stderr message), change strategy (rewrite the file, switch python/python3, fix paths) or finish with an honest failure summary—do not repeat identical failing commands until the step limit.",
    "- If the goal mentions files that should already exist, prefer read_file first to confirm they are there before overwriting.",
    "- Reasonable workflow: write_file the script, run_command to run it (correct cwd), read_file to verify outputs like work/result.txt when needed, then finish with an accurate summary.",
    "- Use only relative paths under the workspace. Do not start paths with .. (e.g. use work/sample.py, not ../sample.py).",
    "- When the goal refers to the work/ folder, use paths like work/... or sandbox/... for new files.",
    "- read_file paths: if inputs or the goal place files under work/, use paths like work/sample.txt and work/result.txt—not bare sample.txt or result.txt at the workspace root.",
    "",
    "Browser + English Wikipedia (research → file):",
    "- Only navigate to origins allowlisted in the host policy. English article/search pages use origin https://en.wikipedia.org — that is different from https://www.wikipedia.org (portal); include https://en.wikipedia.org in the user allowlist for enwiki.",
    "- Fast path: browser_goto to https://en.wikipedia.org/wiki/Special:Search?search=<topic> (encode spaces as + or %20 in the URL), then browser_wait_for on #mw-content-text (or .mw-parser-output), browser_extract_text on #mw-content-text with a sensible maxChars, then write_file the brief report to work/<name>.txt (plain text), then browser_close.",
    "- If the goal says to open the browser, still call browser_open first when you can; otherwise browser_goto and other page tools will start a Playwright session automatically when needed.",
    "- UI path: on https://en.wikipedia.org/wiki/Main_Page use selectors #searchInput, optional click .cdx-search-input__end-button to search, or browser_type into #searchInput with pressEnter true. Article body: extract from #mw-content-text.",
    "- Combine browser tools with write_file in one run: the executor supports both. Put the user-facing summary in write_file content yourself (do not rely on a non-existent summarize_file tool).",
    "",
    "Python inside write_file JSON (critical for small models):",
    "- The whole script is one JSON string value. Prefer Python double-quoted strings and f-strings so single quotes do not fight JSON escaping, e.g. f.write(f\"{char}: {count}\\n\") instead of concatenating with '+ '\\n' +'.",
    "- Open and read the input file first, build counts in memory, then open the output file once and write all lines—do not nest open(result) inside the line loop unless you intend incremental writes.",
    "- After a successful python run, read_file the output; if it is empty, fix the script logic before re-running the same command repeatedly.",
    "- Avoid pointless meta-code (e.g. picking \"python3\" as a string inside the script); the host already runs your file with the right interpreter via run_command.",
    ...platformHints,
    "",
    "Choose exactly one next action.",
    "Available tools:",
    '- finish: {"summary":"string"}',
    '- run_command: {"command":"allowed executable name only","args":["..."],"cwd":"optional relative path"}',
    '- read_file: {"path":"relative path"}',
    '- write_file: {"path":"relative path","content":"entire file as one string — only these two keys"}',
    '- browser_open: {"headless":"optional boolean"}',
    '- browser_goto: {"url":"string"}',
    '- browser_click: {"selector":"string","strict":"optional boolean"}',
    '- browser_type: {"selector":"string","text":"string","clear":"optional boolean","pressEnter":"optional boolean — set true after typing in a search box to submit (e.g. Wikipedia #searchInput)"}',
    '- browser_wait_for: {"selector":"string","state":"optional","timeoutMs":"optional number"}',
    '- browser_extract_text: {"selector":"string","maxChars":"optional number"}',
    '- browser_screenshot: {"name":"optional string","fullPage":"optional boolean"}',
    '- browser_close: {}',
    "",
    "Return strict JSON with shape: {\"thought\":\"...\",\"action\":{\"tool\":\"...\",\"input\":{...}}}",
    "The action \"input\" field is always an object—never omit it. Use {} for tools with no parameters (e.g. browser_close) or only optional flags (e.g. browser_open).",
    `Goal: ${context.goal}`,
    `Max steps: ${context.config.maxSteps}`,
    `Allowed commands: ${context.config.allowedCommands.join(", ")}`,
    "",
    `History:\n${historyLines}`
  ].join("\n");
}
