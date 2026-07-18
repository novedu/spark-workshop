import { NextResponse, type NextRequest } from "next/server";
import { createLlmAdapter } from "@/lib/llm/adapters";
import { getLlmRuntimeConfig } from "@/lib/llm/config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getLlmRuntimeConfig();
  const shouldProbe = request.nextUrl.searchParams.get("probe") === "1";

  if (!shouldProbe || !config.configured) {
    return NextResponse.json({
      ok: true,
      configured: config.configured,
      useMock: config.useMock,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      probe: "skipped"
    });
  }

  try {
    const adapter = createLlmAdapter(config.provider, config);
    const result = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: [
        {
          role: "system",
          content: "You are a health check endpoint. Reply with JSON only."
        },
        {
          role: "user",
          content: "{\"ok\":true}"
        }
      ],
      temperature: 0,
      responseFormat: "json"
    });

    return NextResponse.json({
      ok: true,
      configured: config.configured,
      useMock: config.useMock,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      probe: "passed",
      contentPreview: result.content.slice(0, 120)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: config.configured,
        useMock: config.useMock,
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        probe: "failed",
        error: error instanceof Error ? error.message : "Unknown LLM health probe error."
      },
      { status: 502 }
    );
  }
}
