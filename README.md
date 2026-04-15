# Sandboxed Local AI Agent

TypeScript-first scaffold for a local, safety-constrained AI agent that can interpret a goal, choose from a fixed toolset, execute actions inside a sandbox, and expose the same core runtime to a future Electron UI.

## Current Scope

V1 includes:

- Single-agent loop with step limits
- Fixed tools for command execution and file access
- Workspace sandbox and command allowlist enforcement
- Provider abstraction for local and cloud-backed models
- CLI runner for early validation
- Electron shell placeholder for the next phase

Not included yet:

- Browser automation
- GUI/vision control
- Multi-agent coordination
- Long-term memory
- Production orchestration

## Architecture

- `packages/core`: agent runtime, provider adapters, sandbox, tool registry, shared contracts
- `apps/desktop`: Electron shell that will consume the same core contracts in Phase 2
- `docs`: project definition, phases, and boundaries

## Phased Delivery

1. Foundation: core loop, tool contracts, sandbox, CLI, provider interfaces
2. Desktop UI: Electron app with task input, live logs, stop/step controls
3. Provider expansion: local-first plus optional cloud adapters
4. Safety hardening: persistent audit logs, policy profiles, replay, approvals
5. Browser automation: isolated browser toolset added behind the same sandbox model

## Quick Start

After installing dependencies:

```bash
npm.cmd install
npm.cmd run build
npm.cmd run cli -- --provider mock --goal "Create a Python file that prints Hello World"
```

## Provider Modes

- `mock`: deterministic provider for local development
- `ollama`: local HTTP adapter for local model serving
- `openai-compatible`: cloud or self-hosted OpenAI-style chat endpoint

See [docs/project-phases.md](/E:/Projects/SandboxedComputerUseAgent/docs/project-phases.md) for boundaries and sequencing.

