import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  AgentAction,
  AgentConfig,
  CommandExecution,
  ToolResult
} from "./types.js";

/**
 * Resolve a user-supplied relative path strictly inside workspaceRoot.
 * Leading ".." segments that would escape above the workspace are discarded (clamped to root),
 * so mistaken model paths like "../sample.py" resolve to "sample.py" under the workspace
 * instead of throwing or escaping.
 */
function resolveInsideWorkspace(workspaceRoot: string, candidatePath: string): string {
  const absoluteRoot = path.resolve(workspaceRoot);

  const trimmed = candidatePath.trim();
  if (!trimmed) {
    throw new Error("Path is empty.");
  }

  if (path.isAbsolute(trimmed)) {
    throw new Error(`Absolute paths are not allowed: ${candidatePath}`);
  }

  const normalized = path.normalize(trimmed);
  const segments = normalized.split(/[/\\]+/).filter((segment) => segment.length > 0);

  const stack: string[] = [];
  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (stack.length > 0) {
        stack.pop();
      }
      continue;
    }
    stack.push(segment);
  }

  const safeRelative = stack.join(path.sep);
  const absolutePath = path.resolve(absoluteRoot, safeRelative.length > 0 ? safeRelative : ".");

  if (absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error(`Path escapes workspace: ${candidatePath}`);
  }

  return absolutePath;
}

function argLooksLikeWorkspacePath(arg: string): boolean {
  if (!arg || arg.startsWith("-")) {
    return false;
  }
  if (arg.includes("/") || arg.includes("\\")) {
    return true;
  }
  return /\.(py|js|mjs|cjs|ts|tsx|json|txt|csv|xml|html|md|toml|ya?ml|ini|bat|cmd|ps1)$/i.test(arg);
}

/**
 * When cwd is a subfolder (e.g. work), args like "work/script.py" resolve to work/work/script.py.
 * Rewrite such args to paths relative to cwd when they still point at the same file under workspaceRoot.
 */
function normalizeRunCommandArgs(
  workspaceRoot: string,
  cwdRelative: string | undefined,
  args: string[]
): string[] {
  if (!cwdRelative) {
    return args;
  }

  let absCwd: string;
  try {
    absCwd = resolveInsideWorkspace(workspaceRoot, cwdRelative);
  } catch {
    return args;
  }

  return args.map((arg) => {
    if (!argLooksLikeWorkspacePath(arg)) {
      return arg;
    }
    let absArg: string;
    try {
      absArg = resolveInsideWorkspace(workspaceRoot, arg);
    } catch {
      return arg;
    }
    const rel = path.relative(absCwd, absArg);
    const hasParent =
      !rel ||
      path.isAbsolute(rel) ||
      rel.split(path.sep).includes("..") ||
      rel.split("/").includes("..");
    if (!hasParent) {
      return rel;
    }
    return arg;
  });
}

/**
 * Mitigates models that JSON-encode or double-wrap the intended file body in write_file.content
 * (e.g. a JSON string whose value is another string that still starts with accidental `{"` junk
 * before real Python). Unwrap JSON strings in a bounded loop, then strip a common bad prefix.
 */
function unwrapWriteFileContent(raw: string): string {
  let s = raw.trim();
  for (let i = 0; i < 4; i += 1) {
    try {
      const parsed: unknown = JSON.parse(s);
      if (typeof parsed !== "string") {
        break;
      }
      s = parsed;
    } catch {
      break;
    }
  }

  const t = s.trimStart();
  if (t.startsWith("{") && (t.includes("# -*-") || /\nimport\s/.test(t) || /"\s*import\s/.test(t))) {
    const shebang = s.indexOf("# -*-");
    if (shebang !== -1 && shebang < 120) {
      return s.slice(shebang);
    }
    const nlImport = s.search(/\nimport\s/);
    if (nlImport > 0) {
      return s.slice(nlImport + 1);
    }
    const importAt = s.search(/^\s*import\s/m);
    if (importAt > 0) {
      return s.slice(importAt);
    }
  }
  return s;
}

function isBareFilename(relativePath: string): boolean {
  return !relativePath.includes("/") && !relativePath.includes("\\");
}

async function readFile(workspaceRoot: string, relativePath: string): Promise<ToolResult> {
  const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);
  try {
    const content = await fs.readFile(absolutePath, "utf8");
    return {
      ok: true,
      message: `Read ${relativePath}`,
      data: {
        path: relativePath,
        content
      }
    };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === "ENOENT" && isBareFilename(relativePath)) {
      const fallbackRelative = path.join("work", relativePath);
      try {
        const absoluteFallback = resolveInsideWorkspace(workspaceRoot, fallbackRelative);
        const content = await fs.readFile(absoluteFallback, "utf8");
        return {
          ok: true,
          message: `Read ${fallbackRelative}`,
          data: {
            path: fallbackRelative,
            content
          }
        };
      } catch {
        // fall through to original error
      }
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : "read_file failed."
    };
  }
}

async function writeFile(
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<ToolResult> {
  const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);
  const body = unwrapWriteFileContent(content);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, body, "utf8");
  return {
    ok: true,
    message: `Wrote ${relativePath}`,
    data: {
      path: relativePath,
      bytes: Buffer.byteLength(body, "utf8")
    }
  };
}

function runCommand(
  config: AgentConfig,
  command: string,
  args: string[] = [],
  cwd?: string
): CommandExecution {
  if (!config.allowedCommands.includes(command)) {
    throw new Error(`Command not allowed by policy: ${command}`);
  }

  const workingDirectory = cwd
    ? resolveInsideWorkspace(config.workspaceRoot, cwd)
    : path.resolve(config.workspaceRoot);

  const normalizedArgs = normalizeRunCommandArgs(config.workspaceRoot, cwd, args);

  const child = spawn(command, normalizedArgs, {
    cwd: workingDirectory,
    shell: false,
    windowsHide: true
  });

  const promise = new Promise<ToolResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        resolve({
          ok: false,
          message: `Command timed out after ${config.commandTimeoutMs}ms`,
          data: { stdout, stderr }
        });
      }
    }, config.commandTimeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          ok: false,
          message: error.message,
          data: { stdout, stderr }
        });
      }
    });

    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          ok: code === 0,
          message: code === 0 ? "Command completed successfully." : `Command exited with code ${code}.`,
          data: { stdout, stderr, code }
        });
      }
    });
  });

  return { child, promise };
}

export async function executeAction(action: AgentAction, config: AgentConfig): Promise<ToolResult> {
  try {
    switch (action.tool) {
      case "finish": {
        const summary = (action.input as { summary?: unknown }).summary;
        if (typeof summary !== "string") {
          return {
            ok: false,
            message: "finish requires input.summary as a string."
          };
        }
        return {
          ok: true,
          message: summary
        };
      }
      case "read_file": {
        const input = action.input as Record<string, unknown>;
        const keys = Object.keys(input);
        const extra = keys.filter((k) => k !== "path");
        if (extra.length > 0 || typeof input.path !== "string") {
          return {
            ok: false,
            message: `read_file input must only contain string field "path". Extra keys: ${extra.join(", ") || "(none)"}.`
          };
        }
        return await readFile(config.workspaceRoot, input.path);
      }
      case "write_file": {
        const input = action.input as Record<string, unknown>;
        const keys = Object.keys(input);
        const extra = keys.filter((k) => k !== "path" && k !== "content");
        if (extra.length > 0) {
          return {
            ok: false,
            message: `write_file input must only contain "path" and "content" (both strings). Extra keys: ${extra.join(", ")}. Put the entire file source in a single "content" string—never split lines across JSON keys.`
          };
        }
        if (typeof input.path !== "string" || typeof input.content !== "string") {
          return {
            ok: false,
            message: 'write_file requires string "path" and string "content".'
          };
        }
        return await writeFile(config.workspaceRoot, input.path, input.content);
      }
      case "run_command": {
        const input = action.input as {
          command?: unknown;
          args?: unknown;
          cwd?: unknown;
        };
        if (typeof input.command !== "string" || /\s/.test(input.command)) {
          return {
            ok: false,
            message:
              'run_command "command" must be a single executable name with no whitespace (e.g. "python"); use "args" for flags and script paths.'
          };
        }
        const args = Array.isArray(input.args) ? input.args : [];
        if (!args.every((a): a is string => typeof a === "string")) {
          return {
            ok: false,
            message: "run_command args must be an array of strings when provided."
          };
        }
        if (input.cwd !== undefined && input.cwd !== null && typeof input.cwd !== "string") {
          return {
            ok: false,
            message: 'run_command "cwd" must be a string path when provided.'
          };
        }
        const execution = runCommand(
          config,
          input.command,
          args,
          typeof input.cwd === "string" ? input.cwd : undefined
        );
        return await execution.promise;
      }
      default:
        throw new Error(`Unsupported action type: ${JSON.stringify(action)}`);
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown tool execution error."
    };
  }
}
