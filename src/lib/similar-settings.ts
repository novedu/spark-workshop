import type { SimilarSettingHint } from "@/types/product";

type SimilarSettingKeyword = {
  keyword: string;
  titles: string[];
  riskLevel: SimilarSettingHint["riskLevel"];
  suggestion: string;
};

const keywordTable: SimilarSettingKeyword[] = [
  {
    keyword: "吞噬",
    titles: ["吞噬星空"],
    riskLevel: "medium",
    suggestion: "如果核心能力是吞噬成长，建议明确吞噬对象、代价和限制，避免只剩升级爽点。"
  },
  {
    keyword: "遮天",
    titles: ["遮天"],
    riskLevel: "high",
    suggestion: "避免直接使用相近的境界、古族、帝路等组合，强化自己的世界规则。"
  },
  {
    keyword: "斗气",
    titles: ["斗破苍穹"],
    riskLevel: "high",
    suggestion: "力量体系如果接近斗气升级，建议更换能量来源、晋升代价和社会结构。"
  },
  {
    keyword: "诡秘",
    titles: ["诡秘之主"],
    riskLevel: "medium",
    suggestion: "若采用序列、仪式、旧神等元素，建议把核心差异放在代价机制和世界真相上。"
  },
  {
    keyword: "长廊",
    titles: ["常见无限流/空间副本设定"],
    riskLevel: "low",
    suggestion: "长廊意象常见，建议绑定独特规则，例如记忆、时间、身份或代价。"
  },
  {
    keyword: "系统",
    titles: ["常见系统流作品"],
    riskLevel: "low",
    suggestion: "系统流容易撞味，建议先说明系统为什么存在，以及它向主角索取什么。"
  }
];

export const getSimilarSettingHints = (text: string): SimilarSettingHint[] => {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return keywordTable
    .filter((entry) => normalized.includes(entry.keyword.toLowerCase()))
    .map((entry) => ({
      keyword: entry.keyword,
      possibleTitles: entry.titles,
      riskLevel: entry.riskLevel,
      suggestion: entry.suggestion
    }));
};
