# Desktop App

This Electron shell is Phase 2 of the project. It wraps the shared TypeScript agent runtime with a desktop interface for:

- entering a goal
- selecting a provider
- starting and stopping runs
- observing the live thought/action/result event stream

## Prerequisites

- Node.js 23 or newer
- npm available as `npm.cmd` on Windows

## Run From Repo Root

Install dependencies once:

```powershell
npm.cmd install
```

Build the workspace:

```powershell
npm.cmd run build
```

Launch the Electron app:

```powershell
npm.cmd run dev:desktop
```

## Optional Provider Configuration

### Mock provider

No setup required. This is the best option for local deterministic UI testing.

### Ollama

Set environment variables before launching the desktop app:

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="llama3.1"
npm.cmd run dev:desktop
```

### OpenAI-compatible provider

Set the endpoint, key, and model:

```powershell
$env:OPENAI_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_API_KEY="your_api_key"
$env:OPENAI_MODEL="gpt-4o-mini"
npm.cmd run dev:desktop
```

## Notes

- The desktop app currently loads its HTML and CSS from `apps/desktop/src` and the compiled Electron scripts from `apps/desktop/dist`.
- Use `Ctrl+Enter` inside the goal field to start a run quickly.
- The `Stop` button cancels the run at the next safe boundary in the agent loop.
- Browser automation is available as an optional, policy-gated capability (see `docs/browser-automation.md`).

