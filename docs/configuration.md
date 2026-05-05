# Configuration

This project is **local-first**, but supports optional cloud providers behind the same `ModelProvider` boundary.

The runtime reads configuration from **environment variables** (recommended) and optionally from a **JSON config file** (Phase 3).

## Provider selection

Set one of:

- `AGENT_PROVIDER=mock`
- `AGENT_PROVIDER=ollama`
- `AGENT_PROVIDER=openai-compatible`

If not set, the default is `mock`.

## Ollama

Environment variables:

- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default `llama3.1`)
- `OLLAMA_TIMEOUT_MS` (default `30000`)

## OpenAI-compatible

Environment variables:

- `OPENAI_BASE_URL` (default `https://api.openai.com/v1` or `https://api.openai.com` — both are accepted)
- `OPENAI_API_KEY` (**required**)
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `OPENAI_TIMEOUT_MS` (default `30000`)

Notes:

- The adapter calls `POST /v1/chat/completions` and requests strict JSON responses.
- If you point to a self-hosted OpenAI-compatible endpoint, ensure it supports `response_format: { type: "json_object" }`.

## Browser automation (optional)

The desktop app supports an optional Playwright browser tool family.

Environment variables:

- `BROWSER_ENABLED` (`1`/`true` to enable; default disabled)
- `BROWSER_ALLOWED_ORIGINS` (comma-separated origins)

## Audit artifacts

- `AGENT_AUDIT_DIR` (default `./.agent-runs`)

## Optional JSON config file

The CLI supports `--config <path>` where the file is JSON with shape:

```json
{
  "provider": {
    "kind": "ollama",
    "baseUrl": "http://127.0.0.1:11434",
    "model": "llama3.1",
    "timeoutMs": 30000
  }
}
```

Recommended local pattern:

- Create a git-ignored file such as `config/local.json`
- Pass it via `--config config/local.json`

Never commit secrets (API keys) to the repository.
