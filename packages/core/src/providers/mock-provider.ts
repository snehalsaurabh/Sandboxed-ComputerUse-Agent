import type {
  AgentDecision,
  AgentStepContext,
  ModelProvider,
  ProviderCapabilities,
  WriteFileAction
} from "../types.js";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function helloWorldProgram(goal: string): string | null {
  const normalized = normalize(goal);

  if (normalized.includes("python") && normalized.includes("hello world")) {
    return "print('Hello World')\n";
  }

  if (normalized.includes("typescript") && normalized.includes("hello world")) {
    return "console.log('Hello World');\n";
  }

  return null;
}

export class MockProvider implements ModelProvider {
  readonly kind = "mock" as const;
  readonly capabilities: ProviderCapabilities = {
    strictJson: true,
    streaming: false,
    toolUse: "json",
    notes: "Deterministic provider for local development and UI testing."
  };

  async decide(context: AgentStepContext): Promise<AgentDecision> {
    const last = context.history.at(-1);
    const program = helloWorldProgram(context.goal);

    if (program && context.history.length === 0) {
      const ext = normalize(context.goal).includes("python") ? "py" : "ts";
      const action: WriteFileAction = {
        tool: "write_file",
        input: {
          path: `hello.${ext}`,
          content: program
        }
      };

      return {
        thought: "The task requires creating a source file first.",
        action
      };
    }

    if (last?.action.tool === "write_file" && normalize(context.goal).includes("hello world")) {
      const path = last.action.input.path;
      if (path.endsWith(".py")) {
        return {
          thought: "The file exists, so I should verify it by running Python.",
          action: {
            tool: "run_command",
            input: {
              command: "python",
              args: [path]
            }
          }
        };
      }

      return {
        thought: "The file exists, so I should verify it with Node.",
        action: {
          tool: "run_command",
          input: {
            command: "node",
            args: [path]
          }
        }
      };
    }

    if (last?.action.tool === "run_command") {
      return {
        thought: "The verification step is complete.",
        action: {
          tool: "finish",
          input: {
            summary: "Completed the requested Hello World workflow."
          }
        }
      };
    }

    return {
      thought: "I do not have a specialized policy for this goal, so I should stop safely.",
      action: {
        tool: "finish",
        input: {
          summary: "No deterministic mock strategy available for this goal."
        }
      }
    };
  }
}

