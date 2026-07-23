import { getSimilarSettingHints } from "@/lib/similar-settings";
import { buildPrompt } from "@/lib/prompts";
import { ensureOpeningChapterPlan } from "@/lib/opening-chapter-plan";
import type {
  OpeningChapterGapFillInput,
  OpeningChapterGapFillOutput,
  OpeningChapterDraftGenerationInput,
  OpeningChapterDraftGenerationOutput,
  UserPreference,
  WorldScheme
} from "@/types/product";
import type { LlmProvider, TasteSample } from "./types";

const tasteSamples: TasteSample[] = [
  {
    id: "fast-conflict",
    label: "强冲突爽文",
    styleHint: "快节奏、高压迫、强反击",
    text: "城门口的测灵碑裂开时，所有人都以为少年废了。只有他听见石缝里传来第二道声音：从今天起，你每输一次，都会偷走敌人一分天赋。"
  },
  {
    id: "slow-world",
    label: "宏大世界观",
    styleHint: "慢热、设定铺垫、史诗感",
    text: "北境的雪已经下了三百年。每一片雪落地前，都会映出一个死去王朝的名字。守灯人说，等雪停的那天，所有被历史埋掉的人都会回来讨债。"
  },
  {
    id: "emotion-pull",
    label: "情绪拉扯",
    styleHint: "人设反差、关系张力",
    text: "她亲手把他送进死牢，又在行刑前夜递来一把钥匙。钥匙上刻着两人的婚期，也刻着一句话：逃出去，然后恨我一辈子。"
  },
  {
    id: "mystery-gap",
    label: "信息差悬疑",
    styleHint: "读者知道更多、主角后知后觉",
    text: "主角醒来时，村里人为他办好了葬礼。所有人都说他昨夜死得很安详，只有祠堂里的黑猫一直盯着他的影子，因为影子少了一只手。"
  },
  {
    id: "underdog",
    label: "底层逆袭",
    styleHint: "底层压迫、资源争夺",
    text: "杂役房每月只发一枚废丹，吃下去的人不是疯就是死。少年攥着那枚丹药笑了，因为他体内那口破炉，已经饿了整整十年。"
  },
  {
    id: "warm-daily",
    label: "轻松日常",
    styleHint: "温馨、幽默、低压开局",
    text: "灵田里的萝卜昨晚集体成精，排着队要求涨工资。新任山神翻开祖传账本，发现上一任欠下的不止香火，还有三百斤萝卜叶加班费。"
  }
];

const buildScheme = (
  id: string,
  type: WorldScheme["type"],
  title: string,
  tagline: string,
  seedText: string
): WorldScheme => {
  const coreConcept = `围绕“${seedText}”展开：主角发现这个意象不是偶然灵感，而是一套隐藏世界规则的入口。越深入规则，越要付出身份、记忆或关系上的代价。`;
  const storyHook = `开局主角被迫用一段最珍贵的记忆，换取进入“${seedText}”真相的门票。`;
  const premise = "一个不想被牺牲的底层主角，必须利用禁忌规则反抗垄断真相的旧势力，失败就会失去自我记忆。";
  const storyEngine = "每次变强都要交换记忆、关系或身份，胜利越大，主角越接近真相也越不像原来的自己。";

  return {
    id,
    type,
    title,
    tagline,
    storyHook,
    premise,
    storyEngine,
    coreConcept,
    powerSystem: "以认知、代价和资源交换推动成长，每次升级都必须失去某种确定性。",
    conflictType: "自我保存与世界真相之间的冲突",
    emotionCurve: type === "brainhole" ? "脑洞密集，危机递进" : "压迫开局，中段爆发",
    similarSettingHints: getSimilarSettingHints(`${seedText} ${storyHook} ${premise} ${storyEngine} ${coreConcept}`)
  };
};

export const mockLlmProvider: LlmProvider = {
  generateTasteSamples: async () => {
    buildPrompt("taste.generate-samples");
    return tasteSamples;
  },

  analyzeTastePreference: async (choices) => {
    buildPrompt("taste.analyze-preference", { additionalContext: { choices } });
    const likedIds = new Set(choices.filter((choice) => choice.liked).map((choice) => choice.sampleId));

    const preference: UserPreference = {
      pacePreference: likedIds.has("fast-conflict") || likedIds.has("underdog") ? "fast" : "medium",
      infoGapTolerance: likedIds.has("mystery-gap") || likedIds.has("slow-world") ? "high" : "medium",
      emotionAmplitude: likedIds.has("emotion-pull") ? "high" : "medium",
      styleTendency: likedIds.has("slow-world")
        ? "qidian"
        : likedIds.has("fast-conflict")
          ? "feilu"
          : likedIds.has("emotion-pull")
            ? "jinjiang"
            : "balanced"
    };

    return preference;
  },

  igniteSeed: async ({ seedText, userPreference }) => {
    buildPrompt("seed.ignite", { userInput: seedText, userPreference });
    return {
      schemes: [
        buildScheme("scheme-preference", "preference", "暗廊门票", "想救一个人，先交出一段人生。", seedText),
        buildScheme("scheme-contrast", "contrast", "误封神位", "他越想证明自己普通，世界越逼他成神。", seedText),
        buildScheme("scheme-brainhole", "brainhole", "删稿宇宙", "现实不是被创造的，是被反复删剩下的。", seedText)
      ]
    };
  },

  enhanceOutlineNode: async ({ node }) => {
    buildPrompt("outline.enhance-node", { additionalContext: { node } });

    const contentByKind: Record<string, string> = {
      protagonist:
        "姓名：沈砚。\n底层欲望：他不是单纯想变强，而是想证明自己不是可以被家族随手牺牲的废子。\n开场困境：开局被安排顶替嫡系去送死，所有人都默认他没有选择权。\n成长弧线：从只想活下去，到学会利用规则、重建自己的势力，最后主动选择承担更大的代价。",
      antagonist:
        "开局压力源：资源方、宗门管事、资本团队或家族长辈先压住主角，不急着让终极反派完整登场。\n开局压力源出场：1-30章 / 开局卷。\n阶段 boss：负责执行封锁的人，目标是维护现有资源分配，让主角继续当可替代的牺牲品。\n阶段 boss出场：31-120章 / 新手升级卷。\n制度 / 势力压力：上层势力通过身份、资源、舆论和契约持续卡住主角。\n制度 / 势力压力出场：251-450章 / 势力扩张卷。\n终局对手：真正从资源垄断中获利的规则制定者，先作为影子存在。\n终局对手出场：651章后逐步显形。\n压力升级方式：主角每次破局都会暴露更高层利益链，压力源从具体执行人升级为势力和规则。",
      goldenFinger:
        "能力核心：主角能读取记忆残片，并临时借用其中一项能力。\n限制条件：必须接触承载记忆的物品，同一段记忆只能读取一次。\n使用代价：每次使用都会透支一段记忆或人际关系中的信任。\n升级方式：夺回更高阶的记忆档案，能读取的能力层级越高。\n失控风险：读取过量会混淆自我记忆，甚至把敌人的欲望当成自己的。",
      conflict:
        "主角目标：摆脱被牺牲的命运，并夺回选择自己人生的权利。\n现实阻碍：旧势力掌握资源分配和身份规则，主角越反抗越会被贴上叛逆标签。\n失败代价：一旦失败，他会失去仅剩的庇护者，也会证明底层永远无法翻身。\n升级方式：每次胜利都会撬动一层旧秩序，引出更高层的敌人。",
      act:
        "本卷目标：让主角在一个清晰地图里完成阶段升级。\n阶段压力源：资源被上层垄断，主角必须先被压制再找到破局口。\n小高潮：用一次公开反击兑现前面积累的憋屈，同时收获新资源。\n卷尾钩子：胜利暴露更高层利益链，引出下一卷地图。",
      arcPhase:
        "读者问题：这一阶段主角能否突破当前压力源。\n当前压力源：阶段 boss 或资源门槛持续压住主角。\n爽点兑现：让主角用新方法完成一次可见反击。\n阶段钩子：胜利后露出下一层更高规则。\n状态变化：主角获得阶段成果，同时被更高层势力记录。",
      foreshadowing:
        "埋线：开局出现一枚无法解释的旧印记，只有压力源看到后短暂失态。\n回收：开局篇末尾揭晓印记与主角能力来源有关。\n引爆：中段篇让印记暴露主角真实身份，把个人危机升级成势力追杀。",
      world:
        "核心规则：资源被上层势力按身份分配，底层只能拿到被污染的残余。\n主要势力：旧族、学院、黑市三方互相制衡，但都不希望底层拥有稳定上升通道。\n稀缺资源：干净的修炼资源和身份名额决定一个人能否被承认为真正的强者。\n利益冲突：主角的能力会打破资源垄断，因此天然会被既得利益者围剿。"
    };

    return {
      content:
        contentByKind[node.kind] ||
        "当前节点可以补成三层：先写清目标，再写阻碍，最后写失败代价或回收方式。把设定落到一个具体剧情选择上，读者才会觉得它不是资料卡。",
      suggestions: ["保留已有设定方向", "补齐目标、阻碍和代价", "把补充内容改成你的角色名和专有名词"]
    };
  },

  generateOpeningChapterPlan: async ({ outlineNodes, openingChapterPlan }) => {
    buildPrompt("opening.generate-chapter-plan", { additionalContext: { outlineNodes, openingChapterPlan } });
    const plan = ensureOpeningChapterPlan({
      outlineNodes,
      openingChapterPlan,
      updatedAt: new Date().toISOString()
    });

    return {
      openingChapterPlan: {
        ...plan,
        chapters: plan.chapters.map((chapter) => ({
          ...chapter,
          title: chapter.title || `第${chapter.chapterNumber}章：黄金开局`,
          readerQuestion: chapter.readerQuestion || "主角这一章能不能突破眼前压力？",
          sceneTask: chapter.sceneTask || "把主角目标、压力源和能力边界落到一个具体可写场景。",
          pressureOrPayoff: chapter.pressureOrPayoff || "先制造压迫，再兑现一个小反击或新线索。",
          chapterHook: chapter.chapterHook || "章末留下下一章必须处理的新压力。",
          stateChange: chapter.stateChange || "记录本章结束后的状态变化。"
        }))
      },
      suggestions: [
        "先检查前三章是否形成钩子、压迫和关门。",
        "把章末钩子改成更贴合你的专有名词。",
        "确认每次使用金手指都有边界或代价。"
      ]
    };
  },

  generateOpeningChapterDraft: async (_input: OpeningChapterDraftGenerationInput): Promise<OpeningChapterDraftGenerationOutput> => {
    buildPrompt("opening.generate-chapter-draft");
    throw new Error("Opening chapter draft generation does not support mock fallback.");
  },

  fillOpeningChapterGap: async (_input: OpeningChapterGapFillInput): Promise<OpeningChapterGapFillOutput> => {
    buildPrompt("opening.fill-chapter-gap");
    throw new Error("Opening chapter gap fill does not support mock fallback.");
  },

  explainTheoryCheck: async (result) => {
    buildPrompt("theory.explain-check", { additionalContext: { result } });
    return {
      theoryId: result.theoryId,
      plainExplanation: `这里有点像老书虫会皱眉的地方：${result.reason}`,
      theoryExplanation: "V1 先由规则发现结构缺口，再由模型把问题解释成作者能直接修改的建议。",
      suggestions: [
        "补一个明确的代价或限制，让设定不只是开挂。",
        "把这个问题提前埋到开局篇，后面再回收。",
        "给反派或势力一个同样合理的目标，避免只当工具人。"
      ],
      canIgnore: result.status !== "fail"
    };
  },

  extractSettingKeywords: async (text) => {
    buildPrompt("setting.extract-keywords", { userInput: text });
    return Array.from(new Set(getSimilarSettingHints(text).map((hint) => hint.keyword)));
  }
};
