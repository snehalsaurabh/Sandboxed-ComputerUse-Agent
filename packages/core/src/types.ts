import type { ChildProcessWithoutNullStreams } from "node:child_process";

export type ProviderKind = "mock" | "ollama" | "openai-compatible";

export type ToolName =
  | "run_command"
  | "read_file"
  | "write_file"
  | "finish"
  | "browser_open"
  | "browser_goto"
  | "browser_click"
  | "browser_type"
  | "browser_wait_for"
  | "browser_extract_text"
  | "browser_screenshot"
  | "browser_close";

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
  | WriteFileAction
  | BrowserOpenAction
  | BrowserGotoAction
  | BrowserClickAction
  | BrowserTypeAction
  | BrowserWaitForAction
  | BrowserExtractTextAction
  | BrowserScreenshotAction
  | BrowserCloseAction;

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

export interface BrowserOpenAction {
  tool: "browser_open";
  input: {
    headless?: boolean;
  };
}

export interface BrowserGotoAction {
  tool: "browser_goto";
  input: {
    url: string;
  };
}

export interface BrowserClickAction {
  tool: "browser_click";
  input: {
    selector: string;
    strict?: boolean;
  };
}

export interface BrowserTypeAction {
  tool: "browser_type";
  input: {
    selector: string;
    text: string;
    clear?: boolean;
  };
}

export interface BrowserWaitForAction {
  tool: "browser_wait_for";
  input: {
    selector: string;
    state?: "attached" | "visible" | "hidden" | "detached";
    timeoutMs?: number;
  };
}

export interface BrowserExtractTextAction {
  tool: "browser_extract_text";
  input: {
    selector: string;
    maxChars?: number;
  };
}

export interface BrowserScreenshotAction {
  tool: "browser_screenshot";
  input: {
    name?: string;
    fullPage?: boolean;
  };
}

export interface BrowserCloseAction {
  tool: "browser_close";
  input: Record<string, never>;
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
    }
  | {
      type: "browser_session_started";
      runId: string;
      timestamp: string;
      data?: unknown;
    }
  | {
      type: "browser_navigated";
      runId: string;
      timestamp: string;
      data?: unknown;
    }
  | {
      type: "browser_action_performed";
      runId: string;
      timestamp: string;
      data?: unknown;
    }
  | {
      type: "browser_artifact_created";
      runId: string;
      timestamp: string;
      data?: unknown;
    }
  | {
      type: "browser_session_closed";
      runId: string;
      timestamp: string;
      data?: unknown;
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
  toolExecutor?: (action: AgentAction, config: AgentConfig) => Promise<ToolResult>;
}
