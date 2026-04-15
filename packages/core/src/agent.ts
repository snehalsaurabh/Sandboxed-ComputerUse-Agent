import { executeAction } from "./sandbox.js";
import type {
  AgentConfig,
  AgentEvent,
  AgentRunSummary,
  ModelProvider
} from "./types.js";

export const defaultAgentConfig: AgentConfig = {
  maxSteps: 6,
  workspaceRoot: process.cwd(),
  commandTimeoutMs: 5_000,
  allowedCommands: ["node", "python", "python3", "npm", "npm.cmd", "tsc", "dir", "cmd"]
};

export async function runAgent(
  goal: string,
  provider: ModelProvider,
  config: Partial<AgentConfig> = {},
  onEvent?: (event: AgentEvent) => void
): Promise<AgentRunSummary> {
  const resolvedConfig: AgentConfig = {
    ...defaultAgentConfig,
    ...config
  };
  const history: AgentRunSummary["history"] = [];

  onEvent?.({
    type: "run_started",
    goal,
    provider: provider.kind,
    timestamp: new Date().toISOString()
  });

  for (let step = 1; step <= resolvedConfig.maxSteps; step += 1) {
    const decision = await provider.decide({
      goal,
      config: resolvedConfig,
      history
    });

    const observation = await executeAction(decision.action, resolvedConfig);
    const record = {
      step,
      thought: decision.thought,
      action: decision.action,
      observation,
      timestamp: new Date().toISOString()
    };

    history.push(record);
    onEvent?.({
      type: "step_completed",
      record
    });

    if (decision.action.tool === "finish") {
      const summary = decision.action.input.summary;
      onEvent?.({
        type: "run_completed",
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
  onEvent?.({
    type: "run_completed",
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

