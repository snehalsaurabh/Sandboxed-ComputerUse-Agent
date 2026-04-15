import type { ChildProcessWithoutNullStreams } from "node:child_process";

export type ProviderKind = "mock" | "ollama" | "openai-compatible";

export type ToolName = "run_command" | "read_file" | "write_file" | "finish";

export interface AgentConfig {
  maxSteps: number;
  workspaceRoot: string;
  commandTimeoutMs: number;
  allowedCommands: string[];
}

export interface AgentRunRequest {
  goal: string;
  provider: ProviderKind;
}

export interface AgentStepContext {
  goal: string;
  config: AgentConfig;
  history: AgentStepRecord[];
}

export interface AgentStepRecord {
  step: number;
  thought: string;
  action: AgentAction;
  observation: ToolResult;
  timestamp: string;
}

export interface AgentDecision {
  thought: string;
  action: AgentAction;
}

export type AgentAction =
  | FinishAction
  | RunCommandAction
  | ReadFileAction
  | WriteFileAction;

export interface FinishAction {
  tool: "finish";
  input: {
    summary: string;
  };
}

export interface RunCommandAction {
  tool: "run_command";
  input: {
    command: string;
    args?: string[];
    cwd?: string;
  };
}

export interface ReadFileAction {
  tool: "read_file";
  input: {
    path: string;
  };
}

export interface WriteFileAction {
  tool: "write_file";
  input: {
    path: string;
    content: string;
  };
}

export interface ToolResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

export type AgentEvent =
  | {
      type: "run_started";
      goal: string;
      provider: ProviderKind;
      timestamp: string;
    }
  | {
      type: "step_completed";
      record: AgentStepRecord;
    }
  | {
      type: "run_completed";
      completed: boolean;
      summary: string;
      steps: number;
      timestamp: string;
    }
  | {
      type: "run_failed";
      error: string;
      timestamp: string;
    };

export interface ModelProvider {
  readonly kind: ProviderKind;
  decide(context: AgentStepContext): Promise<AgentDecision>;
}

export interface ProviderFactoryOptions {
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openAiBaseUrl?: string;
  openAiApiKey?: string;
  openAiModel?: string;
}

export interface AgentRunSummary {
  completed: boolean;
  summary: string;
  history: AgentStepRecord[];
}

export interface CommandExecution {
  child: ChildProcessWithoutNullStreams;
  promise: Promise<ToolResult>;
}

