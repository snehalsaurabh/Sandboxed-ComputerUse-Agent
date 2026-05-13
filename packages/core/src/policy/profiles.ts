import type { PolicyProfile } from "./types.js";

export const policyProfiles: Record<string, PolicyProfile> = {
  "safe-default": {
    name: "safe-default",
    version: "1.1",
    maxSteps: 20,
    commandTimeoutMs: 15_000,
    allowedCommands: ["node", "python", "python3", "dir"],
    workspaceRootMode: "cwd",
    fileAccess: {
      read: "any",
      write: "any",
      allowPrefixes: ["work/", "sandbox/"]
    },
    runCommand: {
      requireApproval: true
    },
    writeFile: {
      requireApproval: false
    },
    limits: {
      maxStdoutBytes: 200_000,
      maxStderrBytes: 200_000,
      maxFileWriteBytes: 200_000
    }
  },
  dev: {
    name: "dev",
    version: "1.1",
    maxSteps: 32,
    commandTimeoutMs: 20_000,
    allowedCommands: ["node", "python", "python3", "npm", "npm.cmd", "tsc", "dir", "cmd"],
    workspaceRootMode: "cwd",
    fileAccess: {
      read: "any",
      write: "any"
    },
    runCommand: {
      requireApproval: false
    },
    writeFile: {
      requireApproval: false
    },
    limits: {
      maxStdoutBytes: 1_000_000,
      maxStderrBytes: 1_000_000,
      maxFileWriteBytes: 2_000_000
    }
  }
};

export function getPolicyProfile(name: string | undefined): PolicyProfile {
  if (!name) {
    return policyProfiles["safe-default"];
  }

  return policyProfiles[name] ?? policyProfiles["safe-default"];
}

