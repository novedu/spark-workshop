import { NextResponse, type NextRequest } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";
import type {
  OpeningChapterDraftContextFact,
  OpeningChapterDraftGenerationInput,
  OpeningChapterDraftNumber
} from "@/types/product";

export const runtime = "nodejs";

const isChapterNumber = (value: unknown): value is OpeningChapterDraftNumber =>
  value === 1 || value === 2 || value === 3;

const isStringRecord = (value: unknown) => Boolean(value) && typeof value === "object";

const isContextFact = (value: unknown): value is OpeningChapterDraftContextFact => {
  if (!isStringRecord(value)) return false;
  const fact = value as OpeningChapterDraftContextFact;
  return (
    typeof fact.id === "string" &&
    typeof fact.label === "string" &&
    typeof fact.summary === "string" &&
    (fact.kind === "entity" || fact.kind === "relation" || fact.kind === "foreshadowing" || fact.kind === "event")
  );
};

const isGenerateOpeningChapterDraftRequest = (
  value: unknown
): value is OpeningChapterDraftGenerationInput => {
  if (!isStringRecord(value)) return false;
  const body = value as OpeningChapterDraftGenerationInput;
  return (
    typeof body.projectTitle === "string" &&
    typeof body.seedText === "string" &&
    isChapterNumber(body.chapterNumber) &&
    isStringRecord(body.selectedScheme) &&
    isStringRecord(body.currentChapter) &&
    Array.isArray(body.requiredFacts) &&
    body.requiredFacts.every(isContextFact) &&
    Array.isArray(body.confirmedEvents) &&
    Array.isArray(body.pressureSourceSummary) &&
    Array.isArray(body.goldenFingerSummary)
  );
};

export async function POST(request: NextRequest) {
  const config = getLlmRuntimeConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "LLM provider is not configured."
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    if (!isGenerateOpeningChapterDraftRequest(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid generateOpeningChapterDraft request body."
        },
        { status: 400 }
      );
    }

    const result = await serverLlmProvider.generateOpeningChapterDraft(body);
    return NextResponse.json({
      ok: true,
      source: "llm",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown generateOpeningChapterDraft error."
      },
      { status: 502 }
    );
  }
}
