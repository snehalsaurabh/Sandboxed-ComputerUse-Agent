# Project Definition and Phases

## Project Title

Sandboxed Local AI Agent for Safe Autonomous Computer Interaction

## Objective

Build a local-first AI agent that translates high-level goals into bounded system actions while preserving safety, auditability, and privacy. The system must support local model inference by default, but keep a clean provider boundary so cloud-hosted APIs can be enabled without changing the agent core.

## In Scope

- Single-agent autonomy
- Short-horizon reasoning with strict step limits
- CLI and filesystem tools
- Deterministic sandbox policies
- Structured thought/action/result traces
- TypeScript implementation
- Local-first runtime with optional cloud providers
- Electron desktop shell for later UI phases
- Future browser automation as an isolated extension

## Out of Scope for V1

- Full OS control
- Unrestricted shell access
- Browser automation
- Multi-agent systems
- Long-term memory stores
- Distributed orchestration
- Vision models or GUI perception

## Design Principles

1. Local-first, not local-only
2. Safety before autonomy
3. Structured tools over arbitrary execution
4. Shared contracts across CLI and desktop UI
5. Future capabilities must arrive as isolated tool modules, not core rewrites

## Phase Breakdown

### Phase 1: Core Runtime

Deliverables:

- Agent loop
- Provider abstraction
- Mock plus HTTP provider adapters
- Sandboxed tool execution
- CLI entrypoint
- Audit event stream

Exit criteria:

- A user goal can produce a bounded sequence of tool calls
- All actions are logged with timestamps and results
- Command execution is restricted by workspace and allowlist policy

### Phase 2: Electron Desktop Shell

Deliverables:

- Task input UI
- Live execution feed
- Stop and step controls
- Shared IPC contract with core runtime

Exit criteria:

- Desktop shell can launch agent runs and stream events from the core package

### Phase 3: Provider Expansion

Deliverables:

- Local model adapters hardened
- OpenAI-compatible cloud adapter
- Config-driven provider selection
- Model capability metadata

Exit criteria:

- Switching provider requires configuration only

### Phase 4: Safety and Observability

Deliverables:

- Policy profiles
- Approval hooks for sensitive actions
- Replayable run logs
- Failure taxonomy

Exit criteria:

- Agent runs can be inspected, replayed, and compared under different policies

### Phase 5: Browser Automation

Deliverables:

- Separate browser tool module
- Dedicated policy scope for websites, selectors, downloads, and session storage
- UI surface for browser traces

Exit criteria:

- Browser actions are optional capabilities, not implicit baseline powers

## System Boundary for Browser Automation

Browser automation is explicitly deferred. When added, it should be implemented as a separate tool family with its own policy model, not by broadening the shell tool. That keeps the command sandbox and browser sandbox independently auditable.

## Why TypeScript

- Shared types across core, CLI, and Electron
- Good fit for provider abstractions and event contracts
- Straightforward future extension into browser automation and desktop UI

