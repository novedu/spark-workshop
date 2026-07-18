import type { LlmResultMeta } from "@/types/product";

export type AiUsageOperationId =
  | "igniteSeed"
  | "enhanceOutlineNode"
  | "explainTheoryCheck"
  | "generateTasteSamples"
  | "analyzeTastePreference"
  | "healthProbe";

export type AiUsageEventSource = LlmResultMeta["source"] | "local";

export type AiUsageEvent = {
  id: string;
  operationId: AiUsageOperationId;
  source: AiUsageEventSource;
  createdAt: string;
  estimatedTokens: number;
};

export type AiRunStatus = "pending" | "success" | "fallback" | "failed";

export type AiRunRecord = {
  id: string;
  operationId: AiUsageOperationId;
  status: AiRunStatus;
  source?: AiUsageEventSource;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  estimatedTokens: number;
  error?: string;
};

export type AiUsageSummary = {
  totalEvents: number;
  realCalls: number;
  cacheHits: number;
  localResults: number;
  estimatedTokens: number;
  byOperation: Record<AiUsageOperationId, number>;
};

const sessionKey = "spark-workshop:ai-usage-session:v1";
const runSessionKey = "spark-workshop:ai-run-session:v1";
const maxStoredEvents = 120;
const maxStoredRuns = 80;

const estimatedTokensByOperation: Record<AiUsageOperationId, number> = {
  igniteSeed: 1800,
  enhanceOutlineNode: 700,
  explainTheoryCheck: 700,
  generateTasteSamples: 2200,
  analyzeTastePreference: 500,
  healthProbe: 80
};

const operationIds: AiUsageOperationId[] = [
  "igniteSeed",
  "enhanceOutlineNode",
  "explainTheoryCheck",
  "generateTasteSamples",
  "analyzeTastePreference",
  "healthProbe"
];

const createTelemetryId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ai-usage-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const compactError = (error: unknown) => {
  if (!error) return undefined;
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 160 ? `${message.slice(0, 157)}...` : message;
};

export const listAiUsageEvents = (): AiUsageEvent[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as AiUsageEvent[]) : [];
  } catch {
    return [];
  }
};

const saveAiUsageEvents = (events: AiUsageEvent[]) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(events.slice(-maxStoredEvents)));
  } catch {
    // Best-effort telemetry for local UX only.
  }
};

export const recordAiUsageEvent = (operationId: AiUsageOperationId, source: AiUsageEventSource) => {
  if (typeof window === "undefined") return;

  const event: AiUsageEvent = {
    id: createTelemetryId(),
    operationId,
    source,
    createdAt: new Date().toISOString(),
    estimatedTokens: source === "llm" ? estimatedTokensByOperation[operationId] : 0
  };

  saveAiUsageEvents([...listAiUsageEvents(), event]);
};

export const listAiRuns = (): AiRunRecord[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(runSessionKey);
    return raw ? (JSON.parse(raw) as AiRunRecord[]) : [];
  } catch {
    return [];
  }
};

const saveAiRuns = (runs: AiRunRecord[]) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(runSessionKey, JSON.stringify(runs.slice(-maxStoredRuns)));
  } catch {
    // Best-effort telemetry for local UX only.
  }
};

export const startAiRun = (operationId: AiUsageOperationId) => {
  const run: AiRunRecord = {
    id: createTelemetryId(),
    operationId,
    status: "pending",
    startedAt: new Date().toISOString(),
    estimatedTokens: 0
  };

  if (typeof window !== "undefined") {
    saveAiRuns([...listAiRuns(), run]);
  }

  return run.id;
};

export const finishAiRun = (
  runId: string,
  source: AiUsageEventSource,
  options: {
    status?: Exclude<AiRunStatus, "pending">;
    error?: unknown;
  } = {}
) => {
  const runs = listAiRuns();
  const existing = runs.find((run) => run.id === runId);
  const endedAt = new Date().toISOString();
  const operationId = existing?.operationId ?? "healthProbe";
  const status = options.status ?? (source === "mock" ? "fallback" : "success");
  const estimatedTokens = source === "llm" ? estimatedTokensByOperation[operationId] : 0;
  const finishedRun: AiRunRecord = {
    id: runId,
    operationId,
    status,
    source,
    startedAt: existing?.startedAt ?? endedAt,
    endedAt,
    durationMs: existing ? new Date(endedAt).getTime() - new Date(existing.startedAt).getTime() : 0,
    estimatedTokens,
    error: compactError(options.error)
  };

  const nextRuns = existing
    ? runs.map((run) => (run.id === runId ? finishedRun : run))
    : [...runs, finishedRun];

  saveAiRuns(nextRuns);
  recordAiUsageEvent(operationId, source);
  return finishedRun;
};

export const failAiRun = (runId: string, error: unknown, source: AiUsageEventSource = "local") =>
  finishAiRun(runId, source, {
    status: "failed",
    error
  });

export const resetAiRuns = () => saveAiRuns([]);

export const resetAiUsageEvents = () => {
  saveAiUsageEvents([]);
  resetAiRuns();
};

export const summarizeAiUsageEvents = (events = listAiUsageEvents()): AiUsageSummary => {
  const byOperation = Object.fromEntries(operationIds.map((id) => [id, 0])) as Record<AiUsageOperationId, number>;

  for (const event of events) {
    byOperation[event.operationId] += 1;
  }

  return {
    totalEvents: events.length,
    realCalls: events.filter((event) => event.source === "llm").length,
    cacheHits: events.filter((event) => event.source === "cache").length,
    localResults: events.filter((event) => event.source === "mock" || event.source === "local").length,
    estimatedTokens: events.reduce((sum, event) => sum + event.estimatedTokens, 0),
    byOperation
  };
};
