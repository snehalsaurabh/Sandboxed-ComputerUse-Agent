import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

/**
 * Loads `.env` from the monorepo workspace root (directory that contains `packages/`).
 * Resolves from this file's location so it works for CLI and tests regardless of `process.cwd()`.
 * Dotenv does not override variables already set in the environment.
 */
export function loadWorkspaceEnv(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(here, "..", "..", "..");
  dotenvConfig({ path: path.join(workspaceRoot, ".env") });
}
