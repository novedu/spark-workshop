import { NextResponse, type NextRequest } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";
import type { TasteChoice } from "@/lib/llm/types";

export const runtime = "nodejs";

type AnalyzeTastePreferenceRequest = {
  choices: TasteChoice[];
};

const isTasteChoice = (value: unknown): value is TasteChoice => {
  if (!value || typeof value !== "object") return false;
  const choice = value as TasteChoice;
  return typeof choice.sampleId === "string" && typeof choice.liked === "boolean";
};

const isAnalyzeTastePreferenceRequest = (value: unknown): value is AnalyzeTastePreferenceRequest => {
  if (!value || typeof value !== "object") return false;
  const body = value as AnalyzeTastePreferenceRequest;
  return Array.isArray(body.choices) && body.choices.length > 0 && body.choices.every(isTasteChoice);
};

export async function POST(request: NextRequest) {
  const config = getLlmRuntimeConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        ok: false,
        fallback: "mock",
        error: "LLM provider is not configured."
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    if (!isAnalyzeTastePreferenceRequest(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid analyzeTastePreference request body."
        },
        { status: 400 }
      );
    }

    const preference = await serverLlmProvider.analyzeTastePreference(body.choices);
    return NextResponse.json({
      ok: true,
      source: "llm",
      preference
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        fallback: "mock",
        error: error instanceof Error ? error.message : "Unknown analyzeTastePreference error."
      },
      { status: 502 }
    );
  }
}
