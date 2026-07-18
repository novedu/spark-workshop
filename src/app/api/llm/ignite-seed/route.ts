import { NextResponse, type NextRequest } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";
import type { SeedIgnitionInput } from "@/types/product";

export const runtime = "nodejs";

const isSeedIgnitionInput = (value: unknown): value is SeedIgnitionInput => {
  if (!value || typeof value !== "object") return false;
  const input = value as SeedIgnitionInput;
  return typeof input.seedText === "string" && Boolean(input.userPreference);
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
    if (!isSeedIgnitionInput(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid igniteSeed request body."
        },
        { status: 400 }
      );
    }

    const result = await serverLlmProvider.igniteSeed(body);
    return NextResponse.json({
      ok: true,
      source: "llm",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        fallback: "mock",
        error: error instanceof Error ? error.message : "Unknown igniteSeed error."
      },
      { status: 502 }
    );
  }
}
