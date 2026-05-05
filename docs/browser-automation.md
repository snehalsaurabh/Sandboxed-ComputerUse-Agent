# Browser Automation (Phase 5)

This project adds browser automation **only as an optional capability**. It is implemented as a **separate tool family** using Playwright, with a dedicated policy surface and strong safety defaults.

## Scope (what Phase 5 includes)

- Playwright **Chromium-only** automation (first pass)
- Structured tools (not arbitrary scripts):
  - open/close session
  - navigate to a URL
  - click / type / wait for selector
  - extract visible text from a selector
  - screenshot
  - tracing (Playwright trace zip)
- Per-run isolation:
  - per-run trace/screenshot directories
  - optional per-run downloads directory (disabled by default)
- Auditing:
  - every browser tool invocation emits structured events
  - artifact paths are included in events (trace zip, screenshots)

## Out of scope (explicit)

- Uncontrolled crawling / link following
- CAPTCHA solving / stealth automation
- Multiple tabs/pages orchestration
- Arbitrary JS execution (`page.evaluate`) by default
- Embedded browser UI in the desktop app (Phase 5 only shows trace/artifact links)

## Safety boundary (BrowserPolicy)

Browser automation is controlled by a dedicated policy scope. A run only has browser powers if the selected policy enables them.

### Key controls

- **Origin allowlist**: navigation is only permitted to allowlisted origins (e.g. `https://example.com`).
- **Selector constraints**: selectors are restricted by prefix rules and deny patterns.
- **Downloads**:
  - disabled by default
  - when enabled, downloads are restricted to a per-run folder
  - extension allowlist and max size
  - optional approvals for downloads
- **Storage**:
  - per-run storage state by default (no shared session)
  - no implicit persistence across runs unless explicitly enabled
- **Trace artifacts**:
  - tracing is enabled by default when browser is enabled

## Artifact layout

Per run, artifacts are written under:

- `./.agent-runs/<runId>/browser/trace.zip`
- `./.agent-runs/<runId>/browser/screenshots/*.png`
- `./.agent-runs/<runId>/browser/downloads/` (only if enabled)

## Threat model (what we are defending against)

- **Model misbehavior**: LLM tries to browse arbitrary sites, exfiltrate information, or download executables.
- **Unbounded automation**: accidental loops or broad selectors causing repeated actions.
- **State leakage**: shared cookies/session state across runs.

This phase mitigates these by making browser capability **policy-gated**, **origin-restricted**, and **fully traced**.

