import { promises as fs } from "node:fs";
import type { AgentRuntimeConfig } from "./config.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function loadRuntimeConfigFromFile(path: string): Promise<AgentRuntimeConfig> {
  const raw = await fs.readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.provider) || typeof parsed.provider.kind !== "string") {
    throw new Error("Config file must be JSON with shape: { provider: { kind: string, ... } }");
  }

  return parsed as unknown as AgentRuntimeConfig;
}

