import { buildPrompt } from "@/lib/prompts";
import { getSimilarSettingHints } from "@/lib/similar-settings";
import { getTheoryById } from "@/lib/theory-library";
import type {
  OpeningChapterGapFillInput,
  OpeningChapterGapFillOutput,
  OpeningChapterDraftGenerationInput,
  OpeningChapterDraftGenerationOutput,
  OutlineNodeEnhancementInput,
  OutlineNodeEnhancementOutput,
  OpeningChapterPlan,
  OpeningChapterPlanGenerationInput,
  OpeningChapterPlanGenerationOutput,
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
import { ensureOpeningChapterPlan } from "../opening-chapter-plan";
import { buildOpeningChapterDraftContextSummary } from "../opening-chapter-generation";
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

type RawOpeningChapterPlanOutput = Partial<OpeningChapterPlanGenerationOutput> & {
  openingChapterPlan?: Partial<OpeningChapterPlan>;
  suggestions?: unknown;
};

type RawOpeningChapterDraftOutput = Partial<OpeningChapterDraftGenerationOutput> & {
  title?: unknown;
  content?: unknown;
};

type RawOpeningChapterGapFillOutput = Partial<OpeningChapterGapFillOutput> & {
  content?: unknown;
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
    antagonist: "开局压力源：补充前三章就压住主角的人、规则或资源困境。\n开局压力源出场：1-30章 / 开局卷。\n阶段 boss：补充当前卷或下一卷负责追打主角的具象对手。\n阶段 boss出场：31-120章 / 新手升级卷。\n制度 / 势力压力：补充持续制造压迫的制度、组织或利益链。\n制度 / 势力压力出场：251-450章 / 势力扩张卷。\n终局对手：先写终局影子或方向，不要求完整定死。\n终局对手出场：651章后逐步显形。\n压力升级方式：说明主角每次破局后，压力源如何升级或换层。",
    goldenFinger: "能力核心：补充金手指真正让主角赢的机制。\n限制条件：补充什么情况下不能用、不能连续用或需要什么前置条件。\n使用代价：补充每次使用要付出的具体代价。\n升级方式：补充能力如何随卷或阶段升级。\n失控风险：补充能力开太大后的反噬或副作用。",
    conflict: "补充主角目标、现实阻碍、失败代价和冲突升级方式。",
    act: "补充本卷目标、阶段压力源、升级资源、小高潮、卷尾反转或下一卷钩子。",
    arcPhase: "补充本阶段的读者问题、压力源、爽点兑现、阶段钩子和状态变化。",
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

const normalizeOpeningChapterPlanOutput = (
  raw: RawOpeningChapterPlanOutput,
  input: OpeningChapterPlanGenerationInput
): OpeningChapterPlanGenerationOutput => {
  const fallback = ensureOpeningChapterPlan({
    outlineNodes: input.outlineNodes,
    openingChapterPlan: input.openingChapterPlan,
    updatedAt: new Date().toISOString()
  });
  const rawPlan = raw.openingChapterPlan;
  const rawChapters = Array.isArray(rawPlan?.chapters) ? rawPlan.chapters : [];
  const validChapterByNumber = new Map(
    rawChapters
      .filter((chapter) => {
        if (!chapter || typeof chapter !== "object") return false;
        const chapterNumber = Number((chapter as { chapterNumber?: unknown }).chapterNumber);
        return Number.isInteger(chapterNumber) && chapterNumber >= 1 && chapterNumber <= 30;
      })
      .map((chapter) => {
        const source = chapter as Record<string, unknown>;
        const chapterNumber = Number(source.chapterNumber);
        return [
          chapterNumber,
          {
            chapterNumber,
            title: normalizeText(source.title, fallback.chapters[chapterNumber - 1].title),
            arcPhaseId: typeof source.arcPhaseId === "string" ? source.arcPhaseId : fallback.chapters[chapterNumber - 1].arcPhaseId,
            readerQuestion: normalizeText(source.readerQuestion, fallback.chapters[chapterNumber - 1].readerQuestion),
            sceneTask: normalizeText(source.sceneTask, fallback.chapters[chapterNumber - 1].sceneTask),
            pressureOrPayoff: normalizeText(source.pressureOrPayoff, fallback.chapters[chapterNumber - 1].pressureOrPayoff),
            chapterHook: normalizeText(source.chapterHook, fallback.chapters[chapterNumber - 1].chapterHook),
            requiredFactIds: Array.isArray(source.requiredFactIds)
              ? source.requiredFactIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8)
              : fallback.chapters[chapterNumber - 1].requiredFactIds,
            stateChange: normalizeText(source.stateChange, fallback.chapters[chapterNumber - 1].stateChange),
            notes: typeof source.notes === "string" ? source.notes.trim() : undefined
          }
        ];
      })
  );

  return {
    openingChapterPlan: {
      ...fallback,
      sourceActId: typeof rawPlan?.sourceActId === "string" ? rawPlan.sourceActId : fallback.sourceActId,
      chapters: fallback.chapters.map((chapter) => validChapterByNumber.get(chapter.chapterNumber) ?? chapter),
      updatedAt: new Date().toISOString()
    },
    suggestions: normalizeStringList(raw.suggestions, [
      "先重点人工检查前三章钩子、压迫和关门。",
      "把章末钩子替换成你的专有名词。",
      "检查每章依赖事实是否和主角、压力源、金手指一致。"
    ])
  };
};

const normalizeOpeningChapterDraftOutput = (
  raw: RawOpeningChapterDraftOutput,
  input: OpeningChapterDraftGenerationInput
): OpeningChapterDraftGenerationOutput => {
  const title = normalizeText(raw.title, input.currentChapter.title || `第${input.chapterNumber}章`);
  const content = normalizeText(raw.content, "");
  if (!content) {
    throw new Error("generateOpeningChapterDraft response must include content.");
  }
  const factIds = input.requiredFacts.map((fact) => fact.id);

  return {
    title,
    content,
    contextSummary: {
      factIds,
      confirmedEventIds: input.confirmedEvents.map((event) => event.id),
      previousChapterNumber: input.previousChapter?.chapterNumber,
      fieldGroups: [
        input.protagonistSummary && Object.values(input.protagonistSummary).some(Boolean)
          ? "主角"
          : factIds.some((factId) => factId.startsWith("protagonist")) ? "主角" : "",
        input.pressureSourceSummary.length > 0
          ? "压力源"
          : factIds.some((factId) => factId.startsWith("pressure-")) ? "压力源" : "",
        input.goldenFingerSummary.length > 0
          ? "金手指"
          : factIds.some((factId) => factId.startsWith("golden-finger-")) ? "金手指" : ""
      ].filter((value): value is string => Boolean(value))
    }
  };
};

const normalizeOpeningChapterGapFillOutput = (
  raw: RawOpeningChapterGapFillOutput,
  input: OpeningChapterGapFillInput
): OpeningChapterGapFillOutput => {
  const content = normalizeText(raw.content, "");
  if (!content) {
    throw new Error("fillOpeningChapterGap response must include content.");
  }

  return {
    content,
    contextSummary: {
      ...buildOpeningChapterDraftContextSummary(input),
      gapId: input.gap.id
    }
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
        input.node.kind === "antagonist"
          ? "如果当前节点是 antagonist，content 必须使用这些标签：开局压力源、开局压力源出场、阶段 boss、阶段 boss出场、制度 / 势力压力、制度 / 势力压力出场、终局对手、终局对手出场、压力升级方式。不要把终局对手在开局写死。"
          : input.node.kind === "goldenFinger"
            ? "如果当前节点是 goldenFinger，content 必须使用这些标签：能力核心、限制条件、使用代价、升级方式、失控风险。不要写成无成本万能外挂。"
          : "保持当前节点类型需要的字段口径，优先补目标、阻碍、代价和后续推进。",
        input.node.kind === "antagonist"
          ? "content 控制在 220-520 个中文字符，允许用多行标签承载压力链。"
          : input.node.kind === "goldenFinger"
            ? "content 控制在 180-420 个中文字符，允许用多行标签承载能力边界。"
          : "content 控制在 120-260 个中文字符。",
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

  generateOpeningChapterPlan: async (
    input: OpeningChapterPlanGenerationInput
  ): Promise<OpeningChapterPlanGenerationOutput> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const currentPlan = ensureOpeningChapterPlan({
      outlineNodes: input.outlineNodes,
      openingChapterPlan: input.openingChapterPlan,
      updatedAt: new Date().toISOString()
    });
    const compactNodes = input.outlineNodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      title: node.title,
      contentPreview: node.content.trim().slice(0, 160),
      metadata: node.metadata
    }));
    const prompt = buildPrompt("opening.generate-chapter-plan", {
      additionalContext: {
        outlineNodes: compactNodes,
        currentOpeningChapterPlan: currentPlan
      },
      systemConstraints: [
        "返回严格 JSON 对象，不要加入解释性文字。",
        "openingChapterPlan.chapters 必须包含 30 章，chapterNumber 从 1 到 30。",
        "不要写正文段落；sceneTask 只写场景任务，pressureOrPayoff 只写节奏用途。",
        "requiredFactIds 只能使用上下文里已有或明显约定的事实 ID。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.62,
      maxTokens: 4200,
      timeoutMs: taskTimeout(config.timeoutMs, 90000),
      responseFormat: "json"
    });
    return normalizeOpeningChapterPlanOutput(
      parseLlmJson<RawOpeningChapterPlanOutput>(response.content),
      input
    );
  },

  generateOpeningChapterDraft: async (
    input: OpeningChapterDraftGenerationInput
  ): Promise<OpeningChapterDraftGenerationOutput> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const prompt = buildPrompt("opening.generate-chapter-draft", {
      additionalContext: {
        projectTitle: input.projectTitle,
        seedText: input.seedText,
        selectedScheme: input.selectedScheme,
        currentChapter: input.currentChapter,
        protagonistSummary: input.protagonistSummary,
        pressureSourceSummary: input.pressureSourceSummary,
        goldenFingerSummary: input.goldenFingerSummary,
        requiredFacts: input.requiredFacts,
        confirmedEvents: input.confirmedEvents,
        previousChapter: input.previousChapter
      },
      systemConstraints: [
        "返回严格 JSON 对象，不要加入解释性文字。",
        "title 只写当前章节标题，可在作者原标题基础上微调，不超过 20 个中文字符。",
        "content 只写当前章节正文，不要附带提纲、点评、下一章预告或 Markdown 标记。",
        "正文必须承接 currentChapter 的 readerQuestion、sceneTask、pressureOrPayoff、chapterHook 和 stateChange。",
        "requiredFacts 里给出的事实是硬约束，不能自相矛盾。",
        "如果 previousChapter 存在，必须自然承接 endingExcerpt；如果不存在，不要假装读过上一章。",
        "confirmedEvents 只可作为已发生事实使用，不能擅自扩写为新的设定结论。",
        "未提供的终局设定、人物姓名或地图专有名词不要自行发明。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.72,
      maxTokens: 3200,
      timeoutMs: taskTimeout(config.timeoutMs, 120000),
      responseFormat: "json"
    });
    return normalizeOpeningChapterDraftOutput(
      parseLlmJson<RawOpeningChapterDraftOutput>(response.content),
      input
    );
  },

  fillOpeningChapterGap: async (
    input: OpeningChapterGapFillInput
  ): Promise<OpeningChapterGapFillOutput> => {
    const config = getLlmRuntimeConfig();
    if (!config.configured) {
      throw new Error("LLM provider is not configured.");
    }

    const prompt = buildPrompt("opening.fill-chapter-gap", {
      additionalContext: {
        projectTitle: input.projectTitle,
        selectedScheme: input.selectedScheme,
        currentChapter: input.currentChapter,
        protagonistSummary: input.protagonistSummary,
        pressureSourceSummary: input.pressureSourceSummary,
        goldenFingerSummary: input.goldenFingerSummary,
        requiredFacts: input.requiredFacts,
        confirmedEvents: input.confirmedEvents,
        previousChapter: input.previousChapter,
        gap: input.gap,
        draftContext: input.draftContext
      },
      systemConstraints: [
        "返回严格 JSON 对象，不要加入解释性文字。",
        "content 只写可插入正文的候选文本，不要输出标题、点评、前后对照或 Markdown。",
        "只解决 gap 指定的问题，不重写整章。",
        "必须与 beforeSelection 和 afterSelection 自然衔接。",
        "selectedText 非空时视为待替换内容；不得遗漏其仍然有效的事实。",
        "requiredFacts 和 confirmedEvents 是硬约束，不可改写或新增结论。",
        "保持当前正文的人称、语气和专有名词，不自创新人物、新能力或新地图。"
      ]
    });
    const adapter = createLlmAdapter(config.provider, config);
    const response = await adapter.generate({
      provider: config.provider,
      model: config.model,
      messages: prompt.messages,
      temperature: 0.68,
      maxTokens: 1100,
      timeoutMs: taskTimeout(config.timeoutMs, 90000),
      responseFormat: "json"
    });
    return normalizeOpeningChapterGapFillOutput(
      parseLlmJson<RawOpeningChapterGapFillOutput>(response.content),
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
