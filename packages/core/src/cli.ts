import path from "node:path";
import process from "node:process";
import { loadRuntimeConfigFromEnv, validateRuntimeConfig } from "./config.js";
import { loadRuntimeConfigFromFile } from "./config-file.js";
import { createProviderFromConfig } from "./providers/factory.js";
import { runAgent } from "./agent.js";
import type { ProviderKind } from "./types.js";

interface CliOptions {
  goal: string;
  provider?: ProviderKind;
  workspaceRoot?: string;
  configPath?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--goal" && next) {
      options.goal = next;
      index += 1;
      continue;
    }

    if (token === "--provider" && next) {
      options.provider = next as ProviderKind;
      index += 1;
      continue;
    }

    if (token === "--config" && next) {
      options.configPath = next;
      index += 1;
      continue;
    }

    if (token === "--workspace" && next) {
      options.workspaceRoot = next;
      index += 1;
    }
  }

  if (!options.goal) {
    throw new Error("Missing required flag: --goal");
  }

  return {
    goal: options.goal,
    provider: options.provider,
    workspaceRoot: options.workspaceRoot
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const fromEnv = loadRuntimeConfigFromEnv(process.env);
  const fromFile = options.configPath ? await loadRuntimeConfigFromFile(options.configPath) : undefined;
  const merged = validateRuntimeConfig({
    provider: {
      ...(fromFile?.provider ?? fromEnv.provider),
      kind: options.provider ?? (fromFile?.provider.kind ?? fromEnv.provider.kind)
    } as typeof fromEnv.provider
  });

  const provider = createProviderFromConfig(merged.provider);

  const summary = await runAgent(
    options.goal,
    provider,
    {
      workspaceRoot: options.workspaceRoot
        ? path.resolve(options.workspaceRoot)
        : process.cwd()
    },
    {
      onEvent: (event) => {
        process.stdout.write(`${JSON.stringify(event)}\n`);
      }
    }
  );

  process.stdout.write(`${JSON.stringify({ type: "summary", summary })}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${JSON.stringify({ type: "fatal", error: message })}\n`);
  process.exitCode = 1;
});
