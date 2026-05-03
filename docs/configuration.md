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

- `OPENAI_BASE_URL` (default `https://api.openai.com/v1` or `https://api.openai.com` — both are accepted)\n+- `OPENAI_API_KEY` (**required**)\n+- `OPENAI_MODEL` (default `gpt-4o-mini`)\n+- `OPENAI_TIMEOUT_MS` (default `30000`)\n\nNotes:\n\n- The adapter calls `POST /v1/chat/completions` and requests strict JSON responses.\n- If you point to a self-hosted OpenAI-compatible endpoint, ensure it supports `response_format: { type: \"json_object\" }`.\n\n## Optional JSON config file\n\nThe CLI supports `--config <path>` where the file is JSON with shape:\n\n```json\n{\n  \"provider\": {\n    \"kind\": \"ollama\",\n    \"baseUrl\": \"http://127.0.0.1:11434\",\n    \"model\": \"llama3.1\",\n    \"timeoutMs\": 30000\n  }\n}\n```\n\nRecommended local pattern:\n\n- Create a gitignored file such as `config/local.json`\n- Pass it via `--config config/local.json`\n\nNever commit secrets (API keys) to the repository.\n+
