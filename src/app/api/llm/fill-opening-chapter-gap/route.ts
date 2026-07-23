import { NextResponse, type NextRequest } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";
import type {
  OpeningChapterDraftContextFact,
  OpeningChapterDraftNumber,
  OpeningChapterGapFillInput,
  OpeningChapterGapId
} from "@/types/product";

export const runtime = "nodejs";

const gapIds: OpeningChapterGapId[] = ["length", "hook", "pressure", "state-change"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isChapterNumber = (value: unknown): value is OpeningChapterDraftNumber =>
  value === 1 || value === 2 || value === 3;

const isContextFact = (value: unknown): value is OpeningChapterDraftContextFact => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.summary === "string" &&
    (value.kind === "entity" || value.kind === "relation" || value.kind === "foreshadowing" || value.kind === "event")
  );
};

const isGap = (value: unknown) =>
  isRecord(value) &&
  gapIds.includes(value.id as OpeningChapterGapId) &&
  typeof value.label === "string" && value.label.length <= 80 &&
  typeof value.message === "string" && value.message.length <= 500;

const isDraftContext = (value: unknown) =>
  isRecord(value) &&
  typeof value.title === "string" && value.title.length <= 120 &&
  typeof value.beforeSelection === "string" && value.beforeSelection.length <= 1200 &&
  typeof value.selectedText === "string" && value.selectedText.length <= 1200 &&
  typeof value.afterSelection === "string" && value.afterSelection.length <= 1200;

const isFillOpeningChapterGapRequest = (value: unknown): value is OpeningChapterGapFillInput => {
  if (!isRecord(value)) return false;
  return (
    typeof value.projectTitle === "string" &&
    typeof value.seedText === "string" &&
    isChapterNumber(value.chapterNumber) &&
    isRecord(value.selectedScheme) &&
    isRecord(value.currentChapter) &&
    Array.isArray(value.requiredFacts) &&
    value.requiredFacts.length <= 24 &&
    value.requiredFacts.every(isContextFact) &&
    Array.isArray(value.confirmedEvents) &&
    value.confirmedEvents.length <= 8 &&
    Array.isArray(value.pressureSourceSummary) &&
    value.pressureSourceSummary.length <= 12 &&
    Array.isArray(value.goldenFingerSummary) &&
    value.goldenFingerSummary.length <= 12 &&
    isGap(value.gap) &&
    isDraftContext(value.draftContext)
  );
};

export async function POST(request: NextRequest) {
  const config = getLlmRuntimeConfig();
  if (!config.configured) {
    return NextResponse.json(
      { ok: false, error: "LLM provider is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    if (!isFillOpeningChapterGapRequest(body)) {
      return NextResponse.json(
        { ok: false, error: "Invalid fillOpeningChapterGap request body." },
        { status: 400 }
      );
    }

    const result = await serverLlmProvider.fillOpeningChapterGap(body);
    return NextResponse.json({ ok: true, source: "llm", ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown fillOpeningChapterGap error."
      },
      { status: 502 }
    );
  }
}
