# Sandboxed Local AI Agent

Local-first, safety-constrained **TypeScript** agent runtime that translates a goal into **bounded tool actions** and emits a structured, auditable event stream.

This repo is intentionally scoped as a research/engineering artifact: **controlled autonomy with strict boundaries**.

## Scope (what this project is)

- **Single-agent loop** with strict step budgets
- **Structured tools** (no arbitrary code execution)
  - filesystem: read/write
  - sandboxed command execution (allow list + timeout)
  - optional Playwright browser tool family (policy-gated)
- **Local-first providers** with optional cloud adapters behind the same interface
- **Auditable execution**: structured events plus browser trace artifacts
- **Desktop operator console** (Electron) that streams events live

## Out of scope (explicit)

- Full OS automation / unrestricted shell access
- Vision/GUI perception
- Multi-agent orchestration
- Long-term memory databases

For the phase roadmap and boundaries, see `[docs/project-phases.md](docs/project-phases.md)`.

## Repository layout

- `packages/core`: agent loop, sandbox tools, provider adapters, shared contracts
- `packages/browser`: Playwright browser automation tool family + policy enforcement
- `apps/desktop`: Electron app for entering a goal and watching the live trace
- `docs`: project definition, configuration, and feature boundaries

## Prerequisites

- **Node.js 23+**
- **`npm`** on Windows as `npm.cmd`

If PowerShell blocks scripts (common on locked-down machines), always use `npm.cmd` instead of `npm`.

## Setup

From the repo root:

```powershell
npm.cmd install
npm.cmd run build
```

## Configuration

Copy `.env.example` as a reference for environment variables.

### Provider selection

- `AGENT_PROVIDER=mock` (default)
- `AGENT_PROVIDER=ollama`
- `AGENT_PROVIDER=openai-compatible`

See `[docs/configuration.md](docs/configuration.md)` for all provider variables and optional JSON config file support (`--config`).

### Browser automation (optional)

Browser tools are **disabled by default**. To enable them for desktop runs:

```powershell
$env:BROWSER_ENABLED="1"
$env:BROWSER_ALLOWED_ORIGINS="https://example.com,https://news.ycombinator.com"
```

Browser scope and safety model is defined in `[docs/browser-automation.md](docs/browser-automation.md)`.

## How to run

### CLI

Run a deterministic mock workflow:

```powershell
npm.cmd run cli -- --provider mock --goal "Create a Python file that prints Hello World"
```

Dev mode (TypeScript via `tsx`):

```powershell
npm.cmd run dev:cli -- --provider mock --goal "Create a TypeScript file that prints Hello World"
```

Optional JSON config file:

```powershell
npm.cmd run dev:cli -- --config config/local.json --goal "Create a TypeScript file that prints Hello World"
```

### Desktop (Electron)

```powershell
npm.cmd run dev:desktop
```

## How to test (practical test plan)

This repo currently uses a **manual test plan** (no automated test runner yet).

### 1) Build sanity

```powershell
npm.cmd run build
```

### 2) CLI: mock provider end-to-end

- Run:

```powershell
npm.cmd run dev:cli -- --provider mock --goal "Create a Python file that prints Hello World"
```

- Expect:
  - `run_started`
  - one or more `step_completed`
  - `run_completed`

### 3) Desktop: start/stop

- Launch desktop: `npm.cmd run dev:desktop`
- Start a run with provider `Mock`
- Press **Stop** mid-run and confirm the run ends cleanly

### 4) Desktop: browser automation (policy-gated)

- Enable browser env vars (see above)
- Start a run that triggers `browser_*` tools
- Confirm:
  - browser events appear (`browser_session_started`, `browser_navigated`, etc.)
  - a screenshot is written under `.agent-runs/<runId>/browser/screenshots/`
  - `trace.zip` is written under `.agent-runs/<runId>/browser/`
  - “Open folder” works from the desktop feed

## Security notes

- Do **not** commit secrets (API keys). Use environment variables or a git-ignored local config.
- Browser automation is restricted by an **origin allow list** and selector rules; it is **disabled by default**.

## Dependency hygiene

`npm.cmd install` may report vulnerabilities via `npm audit`. Treat this as a dependency hygiene task:

- Inspect: `npm.cmd audit`
- Fix conservatively: `npm.cmd audit fix`

Avoid `--force` unless you’re prepared for breaking changes.
