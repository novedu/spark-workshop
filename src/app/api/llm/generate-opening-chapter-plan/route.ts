import { NextResponse, type NextRequest } from "next/server";
import { getLlmRuntimeConfig } from "@/lib/llm/config";
import { serverLlmProvider } from "@/lib/llm/server-provider";
import type {
  OpeningChapterPlanGenerationInput,
  OutlineNode,
  OutlineNodeKind
} from "@/types/product";

export const runtime = "nodejs";

const outlineNodeKinds: OutlineNodeKind[] = [
  "world",
  "protagonist",
  "antagonist",
  "goldenFinger",
  "conflict",
  "act",
  "arcPhase",
  "foreshadowing"
];

const isOutlineNodeKind = (value: unknown): value is OutlineNodeKind =>
  typeof value === "string" && outlineNodeKinds.includes(value as OutlineNodeKind);

const isOutlineNode = (value: unknown): value is OutlineNode => {
  if (!value || typeof value !== "object") return false;
  const node = value as OutlineNode;
  return (
    typeof node.id === "string" &&
    isOutlineNodeKind(node.kind) &&
    typeof node.title === "string" &&
    typeof node.content === "string" &&
    typeof node.order === "number"
  );
};

const isGenerateOpeningChapterPlanRequest = (
  value: unknown
): value is OpeningChapterPlanGenerationInput => {
  if (!value || typeof value !== "object") return false;
  const body = value as OpeningChapterPlanGenerationInput;
  return Array.isArray(body.outlineNodes) && body.outlineNodes.every(isOutlineNode);
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
    if (!isGenerateOpeningChapterPlanRequest(body)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid generateOpeningChapterPlan request body."
        },
        { status: 400 }
      );
    }

    const result = await serverLlmProvider.generateOpeningChapterPlan(body);
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
        error: error instanceof Error ? error.message : "Unknown generateOpeningChapterPlan error."
      },
      { status: 502 }
    );
  }
}
