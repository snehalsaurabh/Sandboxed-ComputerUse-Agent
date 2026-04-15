type ProviderKind = "mock" | "ollama" | "openai-compatible";

interface ToolResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

interface AgentAction {
  tool: string;
  input: Record<string, unknown>;
}

interface AgentStepRecord {
  step: number;
  thought: string;
  action: AgentAction;
  observation: ToolResult;
  timestamp: string;
}

type AgentEvent =
  | {
      type: "run_started";
      goal: string;
      provider: ProviderKind;
      timestamp: string;
    }
  | {
      type: "step_completed";
      record: AgentStepRecord;
    }
  | {
      type: "run_completed";
      completed: boolean;
      summary: string;
      steps: number;
      timestamp: string;
    }
  | {
      type: "run_failed";
      error: string;
      timestamp: string;
    };

interface AgentRunSummary {
  completed: boolean;
  summary: string;
  history: AgentStepRecord[];
}

declare global {
  interface Window {
    agentDesktop: {
      run(goal: string, provider: ProviderKind): Promise<AgentRunSummary>;
      stop(): Promise<{ stopped: boolean }>;
      onEvent(listener: (event: AgentEvent) => void): void;
    };
  }
}

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
const inlineNote = document.querySelector<HTMLElement>("#inline-note");

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
  inlineNote: ensureElement(inlineNote, "inline-note")
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
  elements.inlineNote.textContent =
    "Use the mock provider for deterministic local testing. Cloud and local HTTP providers can be swapped in later without changing the core loop.";
  setResultState("Idle", "idle");
  setSummaryState(
    "No run has started yet",
    "The feed on the right will capture the agent's event stream once a run starts.",
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
          <pre>${escapeHtml(detail.value)}</pre>
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
    ${details.length > 0 ? `<div class="event-detail-grid">${detailMarkup}</div>` : ""}
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
      elements.inlineNote.textContent = `Provider: ${event.provider}. Goal submitted at ${formatTime(event.timestamp)}.`;
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
        [{ label: "Provider", value: event.provider }]
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
        [{ label: "Steps", value: String(event.steps) }],
        event.completed ? "success" : "failure"
      );
      break;
    case "run_failed":
      elements.runStatusPill.textContent = "Failed";
      setResultState("Failed", "failure");
      setSummaryState("Run failed", event.error, "Failed", "warning");
      appendTimelineEntry(
        "Run failed",
        formatTime(event.timestamp),
        event.error,
        [],
        "failure"
      );
      break;
    default:
      break;
  }
}

async function startRun(): Promise<void> {
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
  elements.inlineNote.textContent = "Stop requested. The current run will halt at the next safe boundary.";
  await window.agentDesktop.stop();
}

window.agentDesktop.onEvent((event) => {
  handleEvent(event);
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

export {};

