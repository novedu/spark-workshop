import type {
  LlmResultMeta,
  OpeningChapterGapFillInput,
  OpeningChapterGapFillOutput,
  OpeningChapterDraftGenerationInput,
  OpeningChapterDraftGenerationOutput,
  OutlineNodeEnhancementInput,
  OutlineNodeEnhancementOutput,
  OpeningChapterPlanGenerationInput,
  OpeningChapterPlanGenerationOutput,
  RuleCheckResult,
  SeedIgnitionInput,
  SeedIgnitionOutput,
  TheorySuggestion,
  UserPreference
} from "@/types/product";
import { getAiRecoveryCopy } from "@/lib/ai-recovery-copy";
import { getAiUsageSettings } from "@/lib/ai-usage-settings";
import { failAiRun, finishAiRun, startAiRun } from "@/lib/ai-usage-meter";
import { mockLlmProvider } from "./mock-provider";
import type { LlmProvider, TasteChoice, TasteSample } from "./types";

type GenerateTasteSamplesApiResponse = {
  ok?: boolean;
  samples?: TasteSample[];
  error?: string;
};

type AnalyzeTastePreferenceApiResponse = {
  ok?: boolean;
  preference?: UserPreference;
  error?: string;
};

type IgniteSeedApiResponse = SeedIgnitionOutput & {
  ok?: boolean;
  source?: "llm";
  error?: string;
};

type ExplainTheoryCheckApiResponse = TheorySuggestion & {
  ok?: boolean;
  source?: "llm";
  error?: string;
};

type EnhanceOutlineNodeApiResponse = OutlineNodeEnhancementOutput & {
  ok?: boolean;
  source?: "llm";
  error?: string;
};

type GenerateOpeningChapterPlanApiResponse = OpeningChapterPlanGenerationOutput & {
  ok?: boolean;
  source?: "llm";
  error?: string;
};

type GenerateOpeningChapterDraftApiResponse = OpeningChapterDraftGenerationOutput & {
  ok?: boolean;
  source?: "llm";
  error?: string;
};

type FillOpeningChapterGapApiResponse = OpeningChapterGapFillOutput & {
  ok?: boolean;
  source?: "llm";
  error?: string;
};

const cachePrefix = "spark-workshop:llm-cache:v1:";

const getCacheKey = (operation: string, payload: unknown) =>
  `${cachePrefix}${operation}:${JSON.stringify(payload)}`;

const readCache = <T>(operation: string, payload: unknown): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = window.localStorage.getItem(getCacheKey(operation, payload));
    return cached ? (JSON.parse(cached) as T) : null;
  } catch {
    return null;
  }
};

const writeCache = (operation: string, payload: unknown, value: unknown) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getCacheKey(operation, payload), JSON.stringify(value));
  } catch {
    // Cache is best-effort only.
  }
};

const withMeta = <T extends object>(value: T, meta: LlmResultMeta): T & { llmMeta: LlmResultMeta } => ({
  ...value,
  llmMeta: meta
});

const postJson = async <TResponse>(url: string, body: unknown): Promise<TResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
};

export const clientLlmProvider: LlmProvider = {
  generateTasteSamples: async (): Promise<TasteSample[]> => {
    const runId = startAiRun("generateTasteSamples");
    const cachePayload = { operation: "generateTasteSamples" };
    const cached = readCache<TasteSample[]>("generateTasteSamples", cachePayload);
    if (cached) {
      finishAiRun(runId, "cache");
      return cached;
    }

    try {
      const result = await postJson<GenerateTasteSamplesApiResponse>("/api/llm/generate-taste-samples", {});
      if (!Array.isArray(result.samples) || result.samples.length < 6) {
        throw new Error("generateTasteSamples API returned fewer than 6 samples.");
      }
      const samples = result.samples.slice(0, 6);
      writeCache("generateTasteSamples", cachePayload, samples);
      finishAiRun(runId, "llm");
      return samples;
    } catch (error) {
      console.warn("Real generateTasteSamples failed, using mock fallback:", error);
      finishAiRun(runId, "mock", {
        status: "fallback",
        error
      });
      return mockLlmProvider.generateTasteSamples();
    }
  },

  analyzeTastePreference: async (choices: TasteChoice[]): Promise<UserPreference> => {
    const runId = startAiRun("analyzeTastePreference");
    const cachePayload = { choices };
    const cached = readCache<UserPreference>("analyzeTastePreference", cachePayload);
    if (cached) {
      finishAiRun(runId, "cache");
      return cached;
    }

    try {
      const result = await postJson<AnalyzeTastePreferenceApiResponse>("/api/llm/analyze-taste-preference", {
        choices
      });
      if (!result.preference) {
        throw new Error("analyzeTastePreference API returned no preference.");
      }
      writeCache("analyzeTastePreference", cachePayload, result.preference);
      finishAiRun(runId, "llm");
      return result.preference;
    } catch (error) {
      console.warn("Real analyzeTastePreference failed, using mock fallback:", error);
      finishAiRun(runId, "mock", {
        status: "fallback",
        error
      });
      return mockLlmProvider.analyzeTastePreference(choices);
    }
  },

  igniteSeed: async (input: SeedIgnitionInput): Promise<SeedIgnitionOutput> => {
    const runId = startAiRun("igniteSeed");
    const cached = readCache<SeedIgnitionOutput>("igniteSeed", input);
    if (cached) {
      finishAiRun(runId, "cache");
      return withMeta(cached, { source: "cache" });
    }

    try {
      const result = await postJson<IgniteSeedApiResponse>("/api/llm/ignite-seed", input);
      if (!Array.isArray(result.schemes) || result.schemes.length === 0) {
        throw new Error("igniteSeed API returned no schemes.");
      }
      const output: SeedIgnitionOutput = {
        schemes: result.schemes,
        llmMeta: {
          source: result.source === "llm" ? "llm" : "mock"
        }
      };
      if (output.llmMeta?.source === "llm") {
        writeCache("igniteSeed", input, { schemes: output.schemes });
      }
      finishAiRun(runId, output.llmMeta?.source ?? "mock", {
        status: output.llmMeta?.source === "mock" ? "fallback" : "success"
      });
      return output;
    } catch (error) {
      console.warn("Real igniteSeed failed, using mock fallback:", error);
      const fallback = await mockLlmProvider.igniteSeed(input);
      finishAiRun(runId, "mock", {
        status: "fallback",
        error
      });
      return {
        ...fallback,
        llmMeta: {
          source: "mock",
          fallbackReason: getAiRecoveryCopy(error, "灵感引爆").message
        }
      };
    }
  },

  enhanceOutlineNode: async (input: OutlineNodeEnhancementInput): Promise<OutlineNodeEnhancementOutput> => {
    const runId = startAiRun("enhanceOutlineNode");
    const cached = readCache<OutlineNodeEnhancementOutput>("enhanceOutlineNode", input);
    if (cached) {
      finishAiRun(runId, "cache");
      return withMeta(cached, { source: "cache" });
    }

    try {
      const result = await postJson<EnhanceOutlineNodeApiResponse>("/api/llm/enhance-outline-node", input);
      if (!result.content || !Array.isArray(result.suggestions)) {
        throw new Error("enhanceOutlineNode API returned an invalid result.");
      }
      const output: OutlineNodeEnhancementOutput = {
        content: result.content,
        suggestions: result.suggestions,
        llmMeta: {
          source: result.source === "llm" ? "llm" : "mock"
        }
      };
      if (output.llmMeta?.source === "llm") {
        writeCache("enhanceOutlineNode", input, {
          content: output.content,
          suggestions: output.suggestions
        });
      }
      finishAiRun(runId, output.llmMeta?.source ?? "mock", {
        status: output.llmMeta?.source === "mock" ? "fallback" : "success"
      });
      return output;
    } catch (error) {
      console.warn("Real enhanceOutlineNode failed, using mock fallback:", error);
      const fallback = await mockLlmProvider.enhanceOutlineNode(input);
      finishAiRun(runId, "mock", {
        status: "fallback",
        error
      });
      return {
        ...fallback,
        llmMeta: {
          source: "mock",
          fallbackReason: getAiRecoveryCopy(error, "AI补全").message
        }
      };
    }
  },

  generateOpeningChapterPlan: async (
    input: OpeningChapterPlanGenerationInput
  ): Promise<OpeningChapterPlanGenerationOutput> => {
    const runId = startAiRun("generateOpeningChapterPlan");
    const cached = readCache<OpeningChapterPlanGenerationOutput>("generateOpeningChapterPlan", input);
    if (cached) {
      finishAiRun(runId, "cache");
      return withMeta(cached, { source: "cache" });
    }

    try {
      const result = await postJson<GenerateOpeningChapterPlanApiResponse>(
        "/api/llm/generate-opening-chapter-plan",
        input
      );
      if (!result.openingChapterPlan || !Array.isArray(result.openingChapterPlan.chapters)) {
        throw new Error("generateOpeningChapterPlan API returned an invalid result.");
      }
      const output: OpeningChapterPlanGenerationOutput = {
        openingChapterPlan: result.openingChapterPlan,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        llmMeta: {
          source: result.source === "llm" ? "llm" : "mock"
        }
      };
      if (output.llmMeta?.source === "llm") {
        writeCache("generateOpeningChapterPlan", input, {
          openingChapterPlan: output.openingChapterPlan,
          suggestions: output.suggestions
        });
      }
      finishAiRun(runId, output.llmMeta?.source ?? "mock", {
        status: output.llmMeta?.source === "mock" ? "fallback" : "success"
      });
      return output;
    } catch (error) {
      console.warn("Real generateOpeningChapterPlan failed, using mock fallback:", error);
      const fallback = await mockLlmProvider.generateOpeningChapterPlan(input);
      finishAiRun(runId, "mock", {
        status: "fallback",
        error
      });
      return {
        ...fallback,
        llmMeta: {
          source: "mock",
          fallbackReason: getAiRecoveryCopy(error, "前 30 章生成").message
        }
      };
    }
  },

  generateOpeningChapterDraft: async (
    input: OpeningChapterDraftGenerationInput
  ): Promise<OpeningChapterDraftGenerationOutput> => {
    const runId = startAiRun("generateOpeningChapterDraft");

    try {
      const result = await postJson<GenerateOpeningChapterDraftApiResponse>(
        "/api/llm/generate-opening-chapter-draft",
        input
      );
      if (!result.content || !result.contextSummary) {
        throw new Error("generateOpeningChapterDraft API returned an invalid result.");
      }
      finishAiRun(runId, "llm", { status: "success" });
      return {
        title: result.title,
        content: result.content,
        contextSummary: result.contextSummary,
        llmMeta: {
          source: "llm"
        }
      };
    } catch (error) {
      failAiRun(runId, error);
      throw new Error(getAiRecoveryCopy(error, "正文试写", { fallbackAvailable: false }).message);
    }
  },

  fillOpeningChapterGap: async (
    input: OpeningChapterGapFillInput
  ): Promise<OpeningChapterGapFillOutput> => {
    const runId = startAiRun("fillOpeningChapterGap");

    try {
      const result = await postJson<FillOpeningChapterGapApiResponse>(
        "/api/llm/fill-opening-chapter-gap",
        input
      );
      if (!result.content || !result.contextSummary) {
        throw new Error("fillOpeningChapterGap API returned an invalid result.");
      }
      finishAiRun(runId, "llm", { status: "success" });
      return {
        content: result.content,
        contextSummary: result.contextSummary,
        llmMeta: {
          source: "llm"
        }
      };
    } catch (error) {
      failAiRun(runId, error);
      throw new Error(getAiRecoveryCopy(error, "正文缺口补写", { fallbackAvailable: false }).message);
    }
  },

  explainTheoryCheck: async (result: RuleCheckResult): Promise<TheorySuggestion> => {
    const runId = startAiRun("explainTheoryCheck");
    const cached = readCache<TheorySuggestion>("explainTheoryCheck", result);
    if (cached) {
      finishAiRun(runId, "cache");
      return withMeta(cached, { source: "cache" });
    }

    if (getAiUsageSettings().saveTokenMode) {
      const fallback = await mockLlmProvider.explainTheoryCheck(result);
      finishAiRun(runId, "local");
      return {
        ...fallback,
        llmMeta: {
          source: "mock",
          fallbackReason: "省 token 模式已开启：理论解释只使用本地规则。"
        }
      };
    }

    try {
      const explanation = await postJson<ExplainTheoryCheckApiResponse>("/api/llm/explain-theory-check", result);
      if (!explanation.plainExplanation || !Array.isArray(explanation.suggestions)) {
        throw new Error("explainTheoryCheck API returned an invalid explanation.");
      }
      const output: TheorySuggestion = {
        theoryId: result.theoryId,
        plainExplanation: explanation.plainExplanation,
        theoryExplanation: explanation.theoryExplanation,
        suggestions: explanation.suggestions,
        canIgnore: explanation.canIgnore,
        llmMeta: {
          source: explanation.source === "llm" ? "llm" : "mock"
        }
      };
      if (output.llmMeta?.source === "llm") {
        writeCache("explainTheoryCheck", result, {
          theoryId: output.theoryId,
          plainExplanation: output.plainExplanation,
          theoryExplanation: output.theoryExplanation,
          suggestions: output.suggestions,
          canIgnore: output.canIgnore
        });
      }
      finishAiRun(runId, output.llmMeta?.source ?? "mock", {
        status: output.llmMeta?.source === "mock" ? "fallback" : "success"
      });
      return output;
    } catch (error) {
      console.warn("Real explainTheoryCheck failed, using mock fallback:", error);
      const fallback = await mockLlmProvider.explainTheoryCheck(result);
      finishAiRun(runId, "mock", {
        status: "fallback",
        error
      });
      return {
        ...fallback,
        llmMeta: {
          source: "mock",
          fallbackReason: getAiRecoveryCopy(error, "理论解释").message
        }
      };
    }
  },
  extractSettingKeywords: mockLlmProvider.extractSettingKeywords
};
