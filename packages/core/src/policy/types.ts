import type { AgentAction, ToolName } from "../types.js";

export type WorkspaceRootMode = "cwd" | "explicit";

export interface FileAccessPolicy {
  read: "any" | "deny";
  write: "any" | "deny";
  allowPrefixes?: string[];
  denyPrefixes?: string[];
}

export interface PolicyLimits {
  maxStdoutBytes: number;
  maxStderrBytes: number;
  maxFileWriteBytes: number;
}

export interface Rule {
  tool?: ToolName;
  command?: string;
  argsContain?: string;
  pathPrefix?: string;
  reason?: string;
}

export interface ApprovalPolicy {
  requireApproval: boolean;
  approvalRules?: Rule[];
}

export interface PolicyProfile {
  name: string;
  version: string;
  maxSteps: number;
  commandTimeoutMs: number;
  allowedCommands: string[];
  workspaceRootMode: WorkspaceRootMode;
  fileAccess: FileAccessPolicy;
  runCommand: ApprovalPolicy;
  writeFile: ApprovalPolicy;
  limits: PolicyLimits;
}

export interface PolicyDecision {
  required: boolean;
  reason?: string;
}

function matchesRule(action: AgentAction, rule: Rule): boolean {
  if (rule.tool && action.tool !== rule.tool) {
    return false;
  }

  if (rule.command && action.tool === "run_command" && action.input.command !== rule.command) {
    return false;
  }

  if (rule.argsContain && action.tool === "run_command") {
    const args = action.input.args ?? [];
    if (!args.some((arg) => arg.includes(rule.argsContain!))) {
      return false;
    }
  }

  if (rule.pathPrefix) {
    const path =
      action.tool === "read_file"
        ? action.input.path
        : action.tool === "write_file"
          ? action.input.path
          : undefined;
    if (!path || !path.startsWith(rule.pathPrefix)) {
      return false;
    }
  }

  return true;
}

export function policyRequiresApproval(action: AgentAction, policy: PolicyProfile): PolicyDecision {
  if (action.tool === "run_command") {
    if (!policy.runCommand.requireApproval) {
      return { required: false };
    }
    const matched = policy.runCommand.approvalRules?.find((rule) => matchesRule(action, rule));
    return {
      required: true,
      reason: matched?.reason ?? "Policy requires approval for run_command."
    };
  }

  if (action.tool === "write_file") {
    if (!policy.writeFile.requireApproval) {
      return { required: false };
    }
    const matched = policy.writeFile.approvalRules?.find((rule) => matchesRule(action, rule));
    return {
      required: true,
      reason: matched?.reason ?? "Policy requires approval for write_file."
    };
  }

  return { required: false };
}

