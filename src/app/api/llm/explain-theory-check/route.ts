import { NextResponse, type NextRequest } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";
import type { RuleCheckResult, TheoryId, TheorySeverity } from "@/types/product";

export const runtime = "nodejs";

const theoryIdPattern = /^T(?:0[1-9]|[12][0-9]|30)$/;
const severityValues: TheorySeverity[] = ["pass", "warning", "fail"];

const isTheoryId = (value: unknown): value is TheoryId =>
  typeof value === "string" && theoryIdPattern.test(value);

const isSeverity = (value: unknown): value is TheorySeverity =>
  typeof value === "string" && severityValues.includes(value as TheorySeverity);

const isRuleCheckResult = (value: unknown): value is RuleCheckResult => {
  if (!value || typeof value !== "object") return false;
  const result = value as RuleCheckResult;
  return (
    isTheoryId(result.theoryId) &&
    isSeverity(result.status) &&
    typeof result.location === "string" &&
    typeof result.reason === "string" &&
    Array.isArray(result.evidence) &&
    result.evidence.every((item) => typeof item === "string")
  );
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
    if (!isRuleCheckResult(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid explainTheoryCheck request body."
        },
        { status: 400 }
      );
    }

    const result = await serverLlmProvider.explainTheoryCheck(body);
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
        error: error instanceof Error ? error.message : "Unknown explainTheoryCheck error."
      },
      { status: 502 }
    );
  }
}
