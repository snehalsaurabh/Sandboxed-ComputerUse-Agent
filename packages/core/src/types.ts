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
      runId: string;
      goal: string;
      provider: ProviderKind;
      policyName?: string;
      policyVersion?: string;
      timestamp: string;
    }
  | {
      type: "step_completed";
      runId: string;
      record: AgentStepRecord;
    }
  | {
      type: "run_completed";
      runId: string;
      completed: boolean;
      summary: string;
      steps: number;
      timestamp: string;
    }
  | {
      type: "run_failed";
      runId: string;
      code?: string;
      error: string;
      details?: unknown;
      timestamp: string;
    };

export interface ProviderCapabilities {
  strictJson: boolean;
  streaming: boolean;
  toolUse: "none" | "json";
  maxContextTokens?: number;
  notes?: string;
}

export interface ModelProvider {
  readonly kind: ProviderKind;
  readonly capabilities: ProviderCapabilities;
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

export interface AgentRunOptions {
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
  policy?: import("./policy/types.js").PolicyProfile | string;
  runId?: string;
}
