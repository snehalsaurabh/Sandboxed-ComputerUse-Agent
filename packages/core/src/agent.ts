import type {
  AgentConfig,
  AgentEvent,
  AgentRunOptions,
  AgentRunSummary,
  ModelProvider
} from "./types.js";
import { getPolicyProfile } from "./policy/profiles.js";
import type { PolicyProfile } from "./policy/types.js";

export const defaultAgentConfig: AgentConfig = {
  maxSteps: 20,
  workspaceRoot: process.cwd(),
  commandTimeoutMs: 15_000,
  allowedCommands: ["node", "python", "python3", "npm", "npm.cmd", "tsc", "dir", "cmd"]
};

export async function runAgent(
  goal: string,
  provider: ModelProvider,
  config: Partial<AgentConfig> = {},
  options: AgentRunOptions = {}
): Promise<AgentRunSummary> {
  const policy: PolicyProfile | undefined =
    typeof options.policy === "string"
      ? getPolicyProfile(options.policy)
      : options.policy
        ? options.policy
        : getPolicyProfile(undefined);

  const resolvedConfig: AgentConfig = {
    ...defaultAgentConfig,
    ...(policy
      ? {
          maxSteps: policy.maxSteps,
          commandTimeoutMs: policy.commandTimeoutMs,
          allowedCommands: policy.allowedCommands
        }
      : {}),
    ...config
  };
  const history: AgentRunSummary["history"] = [];
  const emit = options.onEvent;
  const runId = options.runId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const execute = options.toolExecutor ?? (await import("./sandbox.js")).executeAction;

  emit?.({
    type: "run_started",
    runId,
    goal,
    provider: provider.kind,
    policyName: policy?.name,
    policyVersion: policy?.version,
    timestamp: new Date().toISOString()
  });

  for (let step = 1; step <= resolvedConfig.maxSteps; step += 1) {
    if (options.signal?.aborted) {
      const summary = "Run stopped by user.";
      emit?.({
        type: "run_completed",
        runId,
        completed: false,
        summary,
        steps: history.length,
        timestamp: new Date().toISOString()
      });

      return {
        completed: false,
        summary,
        history
      };
    }

    const decision = await provider.decide({
      goal,
      config: resolvedConfig,
      history
    });

    const observation = await execute(decision.action, resolvedConfig);
    const record = {
      step,
      thought: decision.thought,
      action: decision.action,
      observation,
      timestamp: new Date().toISOString()
    };

    history.push(record);
    emit?.({
      type: "step_completed",
      runId,
      record
    });

    if (decision.action.tool === "finish") {
      const summary = decision.action.input.summary;
      emit?.({
        type: "run_completed",
        runId,
        completed: true,
        summary,
        steps: history.length,
        timestamp: new Date().toISOString()
      });

      return {
        completed: true,
        summary,
        history
      };
    }
  }

  const summary = "Stopped because the maximum step budget was reached.";
  emit?.({
    type: "run_completed",
    runId,
    completed: false,
    summary,
    steps: history.length,
    timestamp: new Date().toISOString()
  });

  return {
    completed: false,
    summary,
    history
  };
}
