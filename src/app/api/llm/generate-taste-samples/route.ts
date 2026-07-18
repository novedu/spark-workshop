import { NextResponse } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";

export const runtime = "nodejs";

export async function POST() {
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
    const samples = await serverLlmProvider.generateTasteSamples();
    return NextResponse.json({
      ok: true,
      source: "llm",
      samples
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        fallback: "mock",
        error: error instanceof Error ? error.message : "Unknown generateTasteSamples error."
      },
      { status: 502 }
    );
  }
}
