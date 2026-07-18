import { buildPrompt } from "@/lib/prompts";
import { getSimilarSettingHints } from "@/lib/similar-settings";
import { getTheoryById } from "@/lib/theory-library";
import type {
  OutlineNodeEnhancementInput,
  OutlineNodeEnhancementOutput,
  PacePreference,
  PreferenceLevel,
  RuleCheckResult,
  SchemeType,
  SeedIgnitionInput,
  SeedIgnitionOutput,
  StyleTendency,
  TheorySuggestion,
  UserPreference,
  WorldScheme
} from "@/types/product";
import { createLlmAdapter } from "./adapters";
import { getLlmRuntimeConfig } from "./config";
import { parseLlmJson } from "./json";
import type { TasteChoice, TasteSample } from "./types";

type RawScheme = Partial<Omit<WorldScheme, "similarSettingHints">> & {
  type?: string;
};

type RawIgniteSeedOutput = {
  schemes?: RawScheme[];
};

type RawTheorySuggestion = Partial<TheorySuggestion> & {
  suggestions?: unknown;
  canIgnore?: unknown;
};

type RawOutlineNodeEnhancement = Partial<OutlineNodeEnhancementOutput> & {
  suggestions?: unknown;
};

type RawTasteSample = Partial<TasteSample>;

type RawTasteSamplesOutput = RawTasteSample[] | {
  samples?: RawTasteSample[];
};

type RawUserPreference = Partial<UserPreference>;

const schemeTypes: SchemeType[] = ["preference", "contrast", "brainhole"];

const normalizeSchemeType = (value: string | undefined, index: number): SchemeType => {
  if (value === "preference" || value === "contrast" || value === "brainhole") {
    return value;
  }

  return schemeTypes[index] ?? "brainhole";
};

const normalizeText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const tasteSampleFallbacks = [
  {
    id: "fast-conflict",
    label: "强冲突爽文",
    styleHint: "快节奏、高压迫、强反击"
  },
  {
    id: "slow-world",
    label: "宏大世界观",
    styleHint: "慢热、设定铺垫、史诗感"
  },
  {
    id: "emotion-pull",
    label: "情绪拉扯",
    styleHint: "人设反差、关系张力"
  },
  {
    id: "mystery-gap",
    label: "信息差悬疑",
    styleHint: "读者知道更多、主角后知后觉"
  },
  {
    id: "underdog",
    label: "底层逆袭",
    styleHint: "底层压迫、资源争夺"
  },
  {
    id: "warm-daily",
    label: "轻松日常",
    styleHint: "温馨、幽默、低压开局"
  }
] satisfies Array<Pick<TasteSample, "id" | "label" | "styleHint">>;

const pacePreferences: PacePreference[] = ["fast", "medium", "slow"];
const preferenceLevels: PreferenceLevel[] = ["high", "medium", "low"];
const styleTendencies: StyleTendency[] = ["feilu", "qidian", "fanqie", "jinjiang", "balanced"];

const normalizeTasteSamples = (raw: RawTasteSamplesOutput): TasteSample[] => {
  const samples = Array.isArray(raw) ? raw : raw.samples;
  if (!Array.isArray(samples) || samples.length < 6) {
    throw new Error("generateTasteSamples response must include at least 6 samples.");
  }

  return samples.slice(0, 6).map((sample, index): TasteSample => {
    const fallback = tasteSampleFallbacks[index];
    return {
      id: fallback.id,
      label: fallback.label,
      styleHint: fallback.styleHint,
      text: normalizeText(sample.text, "请补充一段有明确情绪钩子的原创网文开篇。")
    };
  });
};

const normalizeEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;

const normalizeUserPreference = (raw: RawUserPreference): UserPreference => ({
  pacePreference: normalizeEnum(raw.pacePreference, pacePreferences, "medium"),
  infoGapTolerance: normalizeEnum(raw.infoGapTolerance, preferenceLevels, "medium"),
  emotionAmplitude: normalizeEnum(raw.emotionAmplitude, preferenceLevels, "medium"),
  styleTendency: normalizeEnum(raw.styleTendency, styleTendencies, "balanced")
});

const taskTimeout = (baseTimeoutMs: number, minimumTimeoutMs: number) =>
  Math.max(baseTimeoutMs, minimumTimeoutMs);

const normalizeIgniteSeedOutput = (raw: RawIgniteSeedOutput): SeedIgnitionOutput => {
  if (!Array.isArray(raw.schemes) || raw.schemes.length < 3) {
    throw new Error("igniteSeed response must include at least 3 schemes.");
  }

  const schemes = raw.schemes.slice(0, 3).map((scheme, index): WorldScheme => {
    const type = normalizeSchemeType(scheme.type, index);
    const title = normalizeText(scheme.title, `方案${index + 1}`);
    const tagline = normalizeText(scheme.tagline, "补充一句能抓住读者的钩子。");
    const coreConcept = normalizeText(scheme.coreConcept, "补充世界观核心设定。");
    const powerSystem = normalizeText(scheme.powerSystem, "补充力量体系、代价和限制。");
    const conflictType = normalizeText(scheme.conflictType, "补充主角目标与核心阻碍。");
    const emotionCurve = normalizeText(scheme.emotionCurve, "补充情绪曲线。");
    const storyHook = normalizeText(scheme.storyHook, tagline);
    const premise = normalizeText(
      scheme.premise,
      `${title}：主角围绕核心目标行动，却被${conflictType}持续阻挡。`
    );
    const storyEngine = normalizeText(
      scheme.storyEngine,
      `围绕${powerSystem}不断制造选择、代价和反击。`
    );

    return {
      id: `scheme-${type}`,
      type,
      title,
      tagline,
      storyHook,
      premise,
      storyEngine,
      coreConcept,
      powerSystem,
      conflictType,
      emotionCurve,
      similarSettingHints: getSimilarSettingHints(
        `${title} ${tagline} ${storyHook} ${premise} ${storyEngine} ${coreConcept} ${powerSystem} ${conflictType} ${emotionCurve}`
      )
    };
  });

  return { schemes };
};

const normalizeStringList = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return items.length > 0 ? items : fallback;
};

const normalizeTheorySuggestion = (raw: RawTheorySuggestion, result: RuleCheckResult): TheorySuggestion => {
  const theory = getTheoryById(result.theoryId);
  const fallbackSuggestions = [
    "先补清楚这个节点的目标、阻碍和代价。",
    "把问题落到一个具体情节，不只停在设定说明。",
    "检查它是否能在开局篇或下一处关键节点被读者感知。"
  ];

  return {
    theoryId: result.theoryId,
    plainExplanation: normalizeText(raw.plainExplanation, `这里命中了本地规则：${result.reason}`),
    theoryExplanation: normalizeText(
      raw.theoryExplanation,
      theory ? `${theory.academicName}的核心是：${theory.coreIdea}` : "本地规则发现了结构缺口，建议先补齐再扩写。"
    ),
    suggestions: normalizeStringList(raw.suggestions, fallbackSuggestions),
    canIgnore: typeof raw.canIgnore === "boolean" ? raw.canIgnore : result.status !== "fail"
  };
};

const normalizeOutlineNodeEnhancement = (
  raw: RawOutlineNodeEnhancement,
  input: OutlineNodeEnhancementInput
): OutlineNodeEnhancementOutput => {
  const fallbackByKind: Record<string, string> = {
    protagonist: "补充主角姓名、底层欲望、开场困境和成长弧线。",
    antagonist: "补充阶段性压力来源、目标、资源、压迫方式，以及它如何和主角欲望形成冲突；不要求开局就确定终极反派。",
    goldenFinger: "补充金手指来源、代价、限制和升级边界。",
    conflict: "补充主角目标、现实阻碍、失败代价和冲突升级方式。",
    act: "补充本卷目标、阶段压力源、升级资源、小高潮、卷尾反转或下一卷钩子。",
    foreshadowing: "补充伏笔的埋设、回收节点和引爆方式。"
  };

  return {
    content: normalizeText(
      raw.content,
      fallbackByKind[input.node.kind] || "补充当前节点的目标、阻碍、代价和后续推进方式。"
    ),
    suggestions: normalizeStringList(raw.suggestions, [
      "把补写内容替换成你的专有名词。",
      "保留最能制造期待感的一条。",
      "检查补写内容是否能服务核心冲突。"
    ])
  };
};

export const serverLlmProvider = {
  generateTasteSamples: async (): Promise<TasteSample[]> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const prompt = buildPrompt("taste.generate-samples", {
      systemConstraints: [
        "每段必须是原创内容，不要模仿或复刻任何具体作品。",
        "返回严格 JSON，既可以是数组，也可以是 { samples } 对象。",
        "每个 text 字段必须是中文正文段落，不要加入解释。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.9,
      maxTokens: 1800,
      timeoutMs: taskTimeout(config.timeoutMs, 90000),
      responseFormat: "json"
    });
    return normalizeTasteSamples(parseLlmJson<RawTasteSamplesOutput>(response.content));
  },

  analyzeTastePreference: async (choices: TasteChoice[]): Promise<UserPreference> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const prompt = buildPrompt("taste.analyze-preference", {
      additionalContext: {
        choices,
        sampleStyleMap: tasteSampleFallbacks
      },
      systemConstraints: [
        "只根据用户喜欢/不喜欢的样本 ID 与样本风格映射判断偏好。",
        "pacePreference 只能取 fast、medium、slow。",
        "infoGapTolerance 和 emotionAmplitude 只能取 high、medium、low。",
        "styleTendency 只能取 feilu、qidian、fanqie、jinjiang、balanced。",
        "返回严格 JSON 对象，不要加入解释。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.35,
      maxTokens: 400,
      timeoutMs: taskTimeout(config.timeoutMs, 60000),
      responseFormat: "json"
    });
    return normalizeUserPreference(parseLlmJson<RawUserPreference>(response.content));
  },

  igniteSeed: async (input: SeedIgnitionInput): Promise<SeedIgnitionOutput> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const prompt = buildPrompt("seed.ignite", {
      userInput: input.seedText,
      userPreference: input.userPreference,
      systemConstraints: [
        "只返回 JSON 对象，不要输出解释性文字。",
        "用户输入可能只是一个词、一个意象或一个小点子；不要要求用户继续补充，直接补足合理创作假设。",
        "三个方案必须都围绕用户原始点子的核心意象展开，不能把点子丢掉。",
        "如果用户输入提到参考作品，只抽象借鉴类型、读者期待和爽点结构，不复用具体人物、世界观、情节或专有设定。",
        "每个方案的 title 控制在 4-10 个中文字符。",
        "tagline 控制在 30 个中文字符以内。",
        "storyHook、premise、storyEngine 分别控制在 60 个中文字符以内。",
        "coreConcept、powerSystem、conflictType、emotionCurve 分别控制在 80 个中文字符以内。",
        "premise 必须同时包含主角目标、阻碍和失败代价。",
        "storyEngine 必须说明什么矛盾能持续制造章节推进。",
        "不要仿写具体作品或 IP。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.75,
      maxTokens: 1600,
      timeoutMs: taskTimeout(config.timeoutMs, 90000),
      responseFormat: "json"
    });
    return normalizeIgniteSeedOutput(parseLlmJson<RawIgniteSeedOutput>(response.content));
  },

  enhanceOutlineNode: async (input: OutlineNodeEnhancementInput): Promise<OutlineNodeEnhancementOutput> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const currentNode = {
      ...input.node,
      content: input.node.content.trim().slice(0, 600)
    };
    const siblingNodes = input.outlineNodes
      .filter((node) => node.id !== input.node.id)
      .map((node) => ({
        id: node.id,
        kind: node.kind,
        title: node.title,
        contentPreview: node.content.trim().slice(0, 80)
      }));
    const prompt = buildPrompt("outline.enhance-node", {
      additionalContext: {
        currentNode,
        siblingNodes
      },
      systemConstraints: [
        "返回严格 JSON 对象，不要加入解释性文字。",
        "content 必须是中文大纲内容，不是正文片段。",
        "content 控制在 120-260 个中文字符。",
        "suggestions 必须是 2-3 条下一步改写提醒。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.65,
      maxTokens: 550,
      timeoutMs: taskTimeout(config.timeoutMs, 60000),
      responseFormat: "json"
    });
    return normalizeOutlineNodeEnhancement(
      parseLlmJson<RawOutlineNodeEnhancement>(response.content),
      input
    );
  },

  explainTheoryCheck: async (result: RuleCheckResult): Promise<TheorySuggestion> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const theory = getTheoryById(result.theoryId);
    const prompt = buildPrompt("theory.explain-check", {
      additionalContext: {
        localRuleResult: result,
        theory: theory
          ? {
              id: theory.id,
              academicName: theory.academicName,
              plainName: theory.plainName,
              coreIdea: theory.coreIdea,
              aiRule: theory.aiRule
            }
          : null
      },
      systemConstraints: [
        "只解释本地规则检测结果，不要推翻或改写检测状态。",
        "不要直接仿写具体作品或 IP。",
        "建议必须面向网文作者，可直接用于修改大纲节点。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.55,
      maxTokens: 900,
      timeoutMs: taskTimeout(config.timeoutMs, 60000),
      responseFormat: "json"
    });
    return normalizeTheorySuggestion(parseLlmJson<RawTheorySuggestion>(response.content), result);
  }
};
