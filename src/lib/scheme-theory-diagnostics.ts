import type { RiskLevel, SimilarSettingHint, V1TheoryId, WorldScheme } from "@/types/product";

export type SchemeDiagnosticRisk = {
  theoryId?: V1TheoryId;
  label: string;
  message: string;
  fixHint: string;
  severity: "warning" | "fail";
};

export type SchemeTheoryDiagnostic = {
  schemeId: string;
  score: number;
  verdict: string;
  tone: "stable" | "caution" | "risky";
  differenceSummary: string;
  strengths: string[];
  risks: SchemeDiagnosticRisk[];
};

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const countKeywordGroups = (text: string, groups: string[][]) =>
  groups.filter((keywords) => hasAnyKeyword(text, keywords)).length;

const worldFactionKeywords = ["势力", "组织", "门派", "家族", "王朝", "公司", "学院", "阵营", "联盟"];
const worldRuleKeywords = ["规则", "制度", "法律", "禁忌", "秩序", "等级", "阶层", "体系", "约束"];
const worldResourceKeywords = ["资源", "灵石", "货币", "能源", "土地", "药材", "功法", "名额", "稀缺"];
const worldConflictKeywords = ["争夺", "垄断", "压迫", "交易", "竞争", "战争", "剥削", "冲突", "利益"];

const conflictGoalKeywords = ["目标", "想要", "追求", "必须", "为了", "执念", "愿望", "需求"];
const conflictObstacleKeywords = ["阻碍", "敌人", "对抗", "不能", "限制", "压迫", "追杀", "竞争", "封锁", "规则"];
const conflictStakesKeywords = ["代价", "失败", "失去", "死亡", "危机", "后果", "牺牲", "风险", "惩罚", "差距", "鸿沟"];

const powerSourceKeywords = ["来源", "获得", "觉醒", "系统", "血脉", "传承", "法宝", "能力", "天赋", "外挂"];
const powerBoundaryKeywords = ["代价", "限制", "反噬", "消耗", "冷却", "交换", "上限", "条件", "副作用", "禁忌", "风险"];
const powerProgressionKeywords = ["升级", "阶段", "等级", "熟练", "解锁", "突破", "进阶", "成长"];
const repeatedPowerKeywords = ["无敌", "秒杀", "碾压", "天下第一", "一直赢", "每次都", "重复", "同样"];

const similarRiskWeight: Record<RiskLevel, number> = {
  low: 4,
  medium: 10,
  high: 18
};

const getHighestSimilarRisk = (hints: SimilarSettingHint[] = []) =>
  hints.reduce<SimilarSettingHint | null>((highest, hint) => {
    if (!highest) return hint;
    return similarRiskWeight[hint.riskLevel] > similarRiskWeight[highest.riskLevel] ? hint : highest;
  }, null);

const getTone = (score: number, failCount: number): SchemeTheoryDiagnostic["tone"] => {
  if (failCount > 0 || score < 62) return "risky";
  if (score < 80) return "caution";
  return "stable";
};

const getVerdict = (tone: SchemeTheoryDiagnostic["tone"]) => {
  if (tone === "stable") return "优先盘";
  if (tone === "caution") return "可推进";
  return "先补关键";
};

const buildSingleSchemeDiagnostic = (scheme: WorldScheme): Omit<SchemeTheoryDiagnostic, "differenceSummary"> => {
  const strengths: string[] = [];
  const risks: SchemeDiagnosticRisk[] = [];
  const hookText = scheme.storyHook?.trim() || scheme.tagline.trim();
  const premiseText = scheme.premise?.trim() || "";
  const engineText = scheme.storyEngine?.trim() || "";
  const worldText = scheme.coreConcept.trim();
  const powerText = scheme.powerSystem.trim();
  const conflictText = scheme.conflictType.trim();

  if (hookText.length >= 12) {
    strengths.push("开篇钩子可见");
  } else {
    risks.push({
      theoryId: "T02",
      label: "开篇钩子",
      message: "方案还没写清第一眼抓读者的钩子。",
      fixHint: "补一个能在第一章出现的压迫、异常或选择。",
      severity: "warning"
    });
  }

  const premiseGroups = premiseText
    ? countKeywordGroups(premiseText, [conflictGoalKeywords, conflictObstacleKeywords, conflictStakesKeywords])
    : 0;
  if (premiseGroups >= 2) {
    strengths.push("故事前提有目标和阻碍");
  } else {
    risks.push({
      theoryId: "T03",
      label: "故事前提",
      message: "premise 还没同时写出主角目标、阻碍和失败代价。",
      fixHint: "用一句话写成：谁想要什么，但被谁阻碍，失败会失去什么。",
      severity: premiseText.length === 0 ? "fail" : "warning"
    });
  }

  if (engineText.length >= 18 && hasAnyKeyword(engineText, ["每次", "持续", "不断", "越", "代价", "升级", "反复", "章节"])) {
    strengths.push("故事引擎能持续供章");
  } else {
    risks.push({
      theoryId: "T07",
      label: "故事引擎",
      message: "故事发动机还不够清楚，可能只能撑一个设定，撑不住连续章节。",
      fixHint: "写清什么矛盾会一轮轮制造目标、阻碍、爆发和新危机。",
      severity: engineText.length === 0 ? "fail" : "warning"
    });
  }

  const worldGroups = countKeywordGroups(worldText, [
    worldFactionKeywords,
    worldRuleKeywords,
    worldResourceKeywords,
    worldConflictKeywords
  ]);
  if (worldGroups >= 2) {
    strengths.push("世界观已有生态支点");
  } else {
    risks.push({
      theoryId: "T13",
      label: "世界生态",
      message: "设定有概念，但势力、规则、资源或利益关系还不够成网。",
      fixHint: "补一组势力、一条规则和一个稀缺资源。",
      severity: "warning"
    });
  }

  const conflictGroups = countKeywordGroups(`${conflictText}\n${premiseText}\n${engineText}`, [
    conflictGoalKeywords,
    conflictObstacleKeywords,
    conflictStakesKeywords
  ]);
  if (conflictGroups >= 2) {
    strengths.push("核心冲突能发动故事");
  } else {
    risks.push({
      theoryId: "T03",
      label: "冲突发动",
      message: "主角想要什么、谁在阻碍、失败代价三件事还没同时站住。",
      fixHint: "用一句话写清目标、阻碍和失败后果。",
      severity: conflictText.length === 0 ? "fail" : "warning"
    });
  }

  const hasPowerSource = hasAnyKeyword(powerText, powerSourceKeywords);
  const hasPowerBoundary = hasAnyKeyword(powerText, powerBoundaryKeywords);
  if (hasPowerSource && hasPowerBoundary) {
    strengths.push("金手指有来源和边界");
  } else {
    risks.push({
      theoryId: "T11",
      label: "力量边界",
      message: "金手指还缺来源、代价、限制或反噬，容易显得太顺。",
      fixHint: "补力量从哪来，以及每次使用要付出什么。",
      severity: powerText.length === 0 ? "fail" : "warning"
    });
  }

  if (hasAnyKeyword(powerText, repeatedPowerKeywords) && !hasAnyKeyword(powerText, powerProgressionKeywords)) {
    risks.push({
      theoryId: "T12",
      label: "爽点重复",
      message: "力量表达偏向连续碾压，但还没看到升级或变形。",
      fixHint: "让能力分阶段解锁，或给不同敌人不同解法。",
      severity: "warning"
    });
  }

  const highestSimilarRisk = getHighestSimilarRisk(scheme.similarSettingHints);
  if (highestSimilarRisk && highestSimilarRisk.riskLevel !== "low") {
    risks.push({
      label: "撞味风险",
      message: `「${highestSimilarRisk.keyword}」可能让读者联想到：${highestSimilarRisk.possibleTitles.join("、")}。`,
      fixHint: highestSimilarRisk.suggestion,
      severity: highestSimilarRisk.riskLevel === "high" ? "fail" : "warning"
    });
  }

  const penalty = risks.reduce((total, risk) => total + (risk.severity === "fail" ? 24 : 13), 0);
  const score = Math.max(0, Math.min(100, 86 + strengths.length * 4 - penalty));
  const failCount = risks.filter((risk) => risk.severity === "fail").length;
  const tone = getTone(score, failCount);

  return {
    schemeId: scheme.id,
    score,
    verdict: getVerdict(tone),
    tone,
    strengths: strengths.slice(0, 3),
    risks
  };
};

export const buildSchemeTheoryDiagnostics = (schemes: WorldScheme[]): SchemeTheoryDiagnostic[] => {
  const baseDiagnostics = schemes.map(buildSingleSchemeDiagnostic);
  if (baseDiagnostics.length === 0) {
    return [];
  }

  const bestScore = Math.max(...baseDiagnostics.map((diagnostic) => diagnostic.score));
  const bestRiskCount = Math.min(...baseDiagnostics.map((diagnostic) => diagnostic.risks.length));

  return baseDiagnostics.map((diagnostic) => {
    const scoreDelta = bestScore - diagnostic.score;
    const riskDelta = diagnostic.risks.length - bestRiskCount;
    const topRisk = diagnostic.risks[0];
    const topStrength = diagnostic.strengths[0];
    let differenceSummary = "";

    if (diagnostic.score === bestScore) {
      differenceSummary = topRisk
        ? `理论风险最低，但优先补「${topRisk.label}」。`
        : "理论风险最低，三件事都比较容易往下盘。";
    } else if (topRisk) {
      differenceSummary = `比最稳方案多 ${riskDelta} 个待补点，主要卡在「${topRisk.label}」。`;
    } else if (topStrength) {
      differenceSummary = `比最稳方案低 ${scoreDelta} 分，但优势在：${topStrength}。`;
    } else {
      differenceSummary = `比最稳方案低 ${scoreDelta} 分，建议先补清核心设定。`;
    }

    return {
      ...diagnostic,
      differenceSummary
    };
  });
};
