import path from "node:path";
import process from "node:process";
import { createProvider } from "./providers/factory.js";
import { runAgent } from "./agent.js";
import type { ProviderKind } from "./types.js";

interface CliOptions {
  goal: string;
  provider: ProviderKind;
  workspaceRoot?: string;
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
    provider: options.provider ?? "mock",
    workspaceRoot: options.workspaceRoot
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const provider = createProvider(options.provider, {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    openAiBaseUrl: process.env.OPENAI_BASE_URL,
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL
  });

  const summary = await runAgent(
    options.goal,
    provider,
    {
      workspaceRoot: options.workspaceRoot
        ? path.resolve(options.workspaceRoot)
        : process.cwd()
    },
    (event) => {
      process.stdout.write(`${JSON.stringify(event)}\n`);
    }
  );

  process.stdout.write(`${JSON.stringify({ type: "summary", summary })}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${JSON.stringify({ type: "fatal", error: message })}\n`);
  process.exitCode = 1;
});

