import type { AgentEvent, AgentRunSummary, ProviderKind } from "@sandboxed-agent/core";

const goalInput = document.querySelector<HTMLTextAreaElement>("#goal-input");
const providerSelect = document.querySelector<HTMLSelectElement>("#provider-select");
const startButton = document.querySelector<HTMLButtonElement>("#start-button");
const stopButton = document.querySelector<HTMLButtonElement>("#stop-button");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
const timeline = document.querySelector<HTMLElement>("#timeline");
const emptyState = document.querySelector<HTMLElement>("#empty-state");
const eventsCount = document.querySelector<HTMLElement>("#events-count");
const stepsCount = document.querySelector<HTMLElement>("#steps-count");
const resultState = document.querySelector<HTMLElement>("#result-state");
const summaryTitle = document.querySelector<HTMLElement>("#summary-title");
const summaryText = document.querySelector<HTMLElement>("#summary-text");
const summaryBadge = document.querySelector<HTMLElement>("#summary-badge");
const summaryCard = document.querySelector<HTMLElement>("#summary-card");
const runStatusPill = document.querySelector<HTMLElement>("#run-status-pill");
const notice = document.querySelector<HTMLElement>("#notice");

let eventTotal = 0;
let stepTotal = 0;
let isRunning = false;

function ensureElement<T extends HTMLElement>(element: T | null, label: string): T {
  if (!element) {
    throw new Error(`Missing renderer element: ${label}`);
  }

  return element;
}

const elements = {
  goalInput: ensureElement(goalInput, "goal-input"),
  providerSelect: ensureElement(providerSelect, "provider-select"),
  startButton: ensureElement(startButton, "start-button"),
  stopButton: ensureElement(stopButton, "stop-button"),
  resetButton: ensureElement(resetButton, "reset-button"),
  timeline: ensureElement(timeline, "timeline"),
  emptyState: ensureElement(emptyState, "empty-state"),
  eventsCount: ensureElement(eventsCount, "events-count"),
  stepsCount: ensureElement(stepsCount, "steps-count"),
  resultState: ensureElement(resultState, "result-state"),
  summaryTitle: ensureElement(summaryTitle, "summary-title"),
  summaryText: ensureElement(summaryText, "summary-text"),
  summaryBadge: ensureElement(summaryBadge, "summary-badge"),
  summaryCard: ensureElement(summaryCard, "summary-card"),
  runStatusPill: ensureElement(runStatusPill, "run-status-pill"),
  notice: ensureElement(notice, "notice")
};

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

function updateRunUiState(running: boolean): void {
  isRunning = running;
  elements.startButton.disabled = running;
  elements.stopButton.disabled = !running;
  elements.goalInput.disabled = running;
  elements.providerSelect.disabled = running;
}

function setSummaryState(
  title: string,
  text: string,
  badge: string,
  mode: "idle" | "running" | "success" | "warning"
): void {
  elements.summaryTitle.textContent = title;
  elements.summaryText.textContent = text;
  elements.summaryBadge.textContent = badge;
  elements.summaryCard.classList.remove(
    "summary-idle",
    "summary-running",
    "summary-success",
    "summary-warning"
  );
  elements.summaryCard.classList.add(`summary-${mode}`);
}

function setResultState(label: string, tone: "idle" | "running" | "success" | "failure"): void {
  elements.resultState.textContent = label;
  elements.resultState.className = `result-${tone}`;
}

function clearTimeline(): void {
  eventTotal = 0;
  stepTotal = 0;
  elements.eventsCount.textContent = "0";
  elements.stepsCount.textContent = "0";
  elements.timeline.innerHTML = "";
  elements.timeline.append(elements.emptyState);
  elements.runStatusPill.textContent = "Idle";
  elements.notice.textContent = "";
  elements.notice.classList.remove("notice-error");
  setResultState("Idle", "idle");
  setSummaryState(
    "No run has started yet",
    "The feed will populate when a run starts.",
    "Idle",
    "idle"
  );
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderObject(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function revealButton(pathValue: string): string {
  return `<button class="button button-secondary" data-reveal="${escapeHtml(pathValue)}" type="button">Open folder</button>`;
}

function appendTimelineEntry(
  title: string,
  meta: string,
  body: string,
  details: Array<{ label: string; value: string }>,
  tone: "neutral" | "success" | "failure" = "neutral"
): void {
  if (elements.emptyState.isConnected) {
    elements.emptyState.remove();
  }

  const entry = document.createElement("article");
  entry.className = `timeline-entry ${tone === "success" ? "event-success" : ""} ${
    tone === "failure" ? "event-failure" : ""
  }`.trim();

  const detailMarkup = details
    .map(
      (detail) => `
        <div class="event-detail">
          <span class="event-detail-label">${escapeHtml(detail.label)}</span>
          ${
            detail.label === "Reveal"
              ? detail.value
              : `<pre>${escapeHtml(detail.value)}</pre>`
          }
        </div>
      `
    )
    .join("");

  entry.innerHTML = `
    <div class="event-header">
      <p class="event-title">${escapeHtml(title)}</p>
      <span class="event-meta">${escapeHtml(meta)}</span>
    </div>
    <p class="event-body">${escapeHtml(body)}</p>
    ${
      details.length > 0
        ? `<details class="entry-details"><summary>Details</summary><div class="event-detail-grid">${detailMarkup}</div></details>`
        : ""
    }
  `;

  elements.timeline.append(entry);
  entry.scrollIntoView({ block: "end", behavior: "smooth" });
}

function handleEvent(event: AgentEvent): void {
  eventTotal += 1;
  elements.eventsCount.textContent = String(eventTotal);

  switch (event.type) {
    case "run_started":
      elements.runStatusPill.textContent = "Running";
      elements.notice.textContent = `Provider: ${event.provider} · Policy: ${event.policyName ?? "unknown"} · Run: ${event.runId}`;
      setResultState("Running", "running");
      setSummaryState(
        "Agent run in progress",
        "The agent is reasoning over the goal and emitting structured execution events.",
        "Running",
        "running"
      );
      appendTimelineEntry(
        "Run started",
        formatTime(event.timestamp),
        event.goal,
        [
          { label: "Run", value: event.runId },
          { label: "Provider", value: event.provider },
          { label: "Policy", value: `${event.policyName ?? ""} ${event.policyVersion ?? ""}`.trim() }
        ]
      );
      break;
    case "step_completed":
      stepTotal = event.record.step;
      elements.stepsCount.textContent = String(stepTotal);
      setResultState(event.record.observation.ok ? "Last step ok" : "Last step failed", event.record.observation.ok ? "success" : "failure");
      appendTimelineEntry(
        `Step ${event.record.step}: ${event.record.action.tool}`,
        formatTime(event.record.timestamp),
        event.record.thought,
        [
          { label: "Action", value: renderObject(event.record.action) },
          { label: "Observation", value: renderObject(event.record.observation) }
        ],
        event.record.observation.ok ? "success" : "failure"
      );
      break;
    case "run_completed":
      elements.runStatusPill.textContent = event.completed ? "Completed" : "Stopped";
      setResultState(event.completed ? "Completed" : "Stopped", event.completed ? "success" : "failure");
      setSummaryState(
        event.completed ? "Run completed" : "Run stopped",
        event.summary,
        event.completed ? "Success" : "Stopped",
        event.completed ? "success" : "warning"
      );
      appendTimelineEntry(
        event.completed ? "Run completed" : "Run stopped",
        formatTime(event.timestamp),
        event.summary,
        [
          { label: "Run", value: event.runId },
          { label: "Steps", value: String(event.steps) }
        ],
        event.completed ? "success" : "failure"
      );
      break;
    case "run_failed":
      elements.runStatusPill.textContent = "Failed";
      setResultState("Failed", "failure");
      elements.notice.textContent = event.code ? `${event.code}: ${event.error}` : event.error;
      elements.notice.classList.add("notice-error");
      setSummaryState("Run failed", event.error, "Failed", "warning");
      appendTimelineEntry(
        "Run failed",
        formatTime(event.timestamp),
        event.error,
        event.details ? [{ label: "Details", value: renderObject(event.details) }] : [],
        "failure"
      );
      break;
    case "browser_session_started":
      appendTimelineEntry(
        "Browser session started",
        formatTime(event.timestamp),
        "Playwright session opened.",
        event.data ? [{ label: "Data", value: renderObject(event.data) }] : []
      );
      break;
    case "browser_navigated":
      appendTimelineEntry(
        "Browser navigated",
        formatTime(event.timestamp),
        "Navigation completed.",
        event.data ? [{ label: "Data", value: renderObject(event.data) }] : []
      );
      break;
    case "browser_action_performed":
      appendTimelineEntry(
        "Browser action",
        formatTime(event.timestamp),
        "Action performed.",
        event.data ? [{ label: "Data", value: renderObject(event.data) }] : []
      );
      break;
    case "browser_artifact_created": {
      const payload = event.data as { path?: string } | undefined;
      const pathValue = payload?.path;
      appendTimelineEntry(
        "Browser artifact",
        formatTime(event.timestamp),
        pathValue ? `Artifact written: ${pathValue}` : "Artifact created.",
        event.data
          ? [
              { label: "Data", value: renderObject(event.data) },
              ...(pathValue ? [{ label: "Reveal", value: revealButton(pathValue) }] : [])
            ]
          : []
      );
      break;
    }
    case "browser_session_closed":
      appendTimelineEntry(
        "Browser session closed",
        formatTime(event.timestamp),
        "Playwright session closed.",
        event.data ? [{ label: "Data", value: renderObject(event.data) }] : []
      );
      break;
    default:
      break;
  }
}

async function startRun(): Promise<void> {
  if (!("agentDesktop" in window) || !window.agentDesktop) {
    setSummaryState(
      "Desktop bridge unavailable",
      "Preload did not expose window.agentDesktop. Rebuild and check the DevTools console.",
      "Error",
      "warning"
    );
    return;
  }

  const goal = elements.goalInput.value.trim();
  const provider = elements.providerSelect.value as ProviderKind;

  if (!goal) {
    setSummaryState("Goal required", "Enter a concrete task before starting the agent.", "Input needed", "warning");
    return;
  }

  clearTimeline();
  updateRunUiState(true);

  try {
    await window.agentDesktop.run(goal, provider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown desktop error.";
    setResultState("Failed", "failure");
    setSummaryState("Desktop run failed", message, "Failed", "warning");
    appendTimelineEntry("Desktop error", "Now", message, [], "failure");
  } finally {
    updateRunUiState(false);
  }
}

async function stopRun(): Promise<void> {
  if (!window.agentDesktop) {
    return;
  }

  elements.notice.textContent = "Stop requested. The current run will halt at the next safe boundary.";
  elements.notice.classList.remove("notice-error");
  await window.agentDesktop.stop();
}

elements.timeline.addEventListener("click", (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target || !window.agentDesktop) {
    return;
  }
  if (target instanceof HTMLButtonElement && target.dataset.reveal) {
    void window.agentDesktop.revealInFolder(target.dataset.reveal);
  }
});

elements.startButton.addEventListener("click", () => {
  void startRun();
});

elements.stopButton.addEventListener("click", () => {
  void stopRun();
});

elements.resetButton.addEventListener("click", () => {
  if (isRunning) {
    return;
  }

  clearTimeline();
});

elements.goalInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !isRunning) {
    event.preventDefault();
    void startRun();
  }
});

clearTimeline();

if (!window.agentDesktop) {
  elements.startButton.disabled = true;
  elements.stopButton.disabled = true;
  elements.resetButton.disabled = true;
  setSummaryState(
    "Desktop bridge unavailable",
    "Preload did not expose window.agentDesktop (often caused by a failing preload script under Electron sandboxing). Rebuild the app, then check View → Toggle Developer Tools for errors.",
    "Error",
    "warning"
  );
  setResultState("Bridge missing", "failure");
} else {
  window.agentDesktop.onEvent((event) => {
    handleEvent(event);
  });
}

export {};

