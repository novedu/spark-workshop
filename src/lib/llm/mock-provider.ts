import { getSimilarSettingHints } from "@/lib/similar-settings";
import { buildPrompt } from "@/lib/prompts";
import type { UserPreference, WorldScheme } from "@/types/product";
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

  return {
    id,
    type,
    title,
    tagline,
    coreConcept,
    powerSystem: "以认知、代价和资源交换推动成长，每次升级都必须失去某种确定性。",
    conflictType: "自我保存与世界真相之间的冲突",
    emotionCurve: type === "brainhole" ? "脑洞密集，危机递进" : "压迫开局，中段爆发",
    similarSettingHints: getSimilarSettingHints(`${seedText} ${coreConcept}`)
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

  explainTheoryCheck: async (result) => {
    buildPrompt("theory.explain-check", { additionalContext: { result } });
    return {
      theoryId: result.theoryId,
      plainExplanation: `这里有点像老书虫会皱眉的地方：${result.reason}`,
      theoryExplanation: "V1 先由规则发现结构缺口，再由模型把问题解释成作者能直接修改的建议。",
      suggestions: [
        "补一个明确的代价或限制，让设定不只是开挂。",
        "把这个问题提前埋到第一幕，后面再回收。",
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
