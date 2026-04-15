import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type {
  AgentAction,
  AgentConfig,
  CommandExecution,
  ToolResult
} from "./types.js";

function resolveInsideWorkspace(workspaceRoot: string, candidatePath: string): string {
  const absoluteRoot = path.resolve(workspaceRoot);
  const absolutePath = path.resolve(absoluteRoot, candidatePath);

  if (absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error(`Path escapes workspace: ${candidatePath}`);
  }

  return absolutePath;
}

async function readFile(workspaceRoot: string, relativePath: string): Promise<ToolResult> {
  const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);
  const content = await fs.readFile(absolutePath, "utf8");
  return {
    ok: true,
    message: `Read ${relativePath}`,
    data: {
      path: relativePath,
      content
    }
  };
}

async function writeFile(
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<ToolResult> {
  const absolutePath = resolveInsideWorkspace(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
  return {
    ok: true,
    message: `Wrote ${relativePath}`,
    data: {
      path: relativePath,
      bytes: Buffer.byteLength(content, "utf8")
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

  const child = spawn(command, args, {
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
      case "finish":
        return {
          ok: true,
          message: action.input.summary
        };
      case "read_file":
        return readFile(config.workspaceRoot, action.input.path);
      case "write_file":
        return writeFile(config.workspaceRoot, action.input.path, action.input.content);
      case "run_command": {
        const execution = runCommand(
          config,
          action.input.command,
          action.input.args ?? [],
          action.input.cwd
        );
        return execution.promise;
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
