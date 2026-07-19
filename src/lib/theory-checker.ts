import type {
  OutlineNode,
  Project,
  TheoryCheckResult,
  TheoryDefinition,
  TheoryId,
  TheoryMatch,
  TheoryMatchLevel,
  TheoryMatchReason,
  TheorySeverity,
  V1TheoryId
} from "@/types/product";
import { v1Theories, getTheoryById } from "./theory-library";
import { llmProvider } from "./llm";
import { getOutlineNodeDisplayTitle } from "./outline-ux";

export type TheoryCheckWithExplanation = TheoryCheckResult & {
  theory: TheoryDefinition;
  plainExplanation: string;
  theoryExplanation: string;
  suggestions: string[];
  canIgnore: boolean;
};

type TheoryCheckContext = {
  outlineNodes: OutlineNode[];
};

const nodeTheoryMap: Record<string, V1TheoryId[]> = {
  world: ["T13"],
  protagonist: ["T02"],
  "golden-finger": ["T11", "T12"],
  "core-conflict": ["T03"],
  "act-1": ["T01", "T07"],
  "act-2": ["T01", "T07"],
  "act-3": ["T01", "T07"],
  "act-4": ["T01", "T07"],
  "act-5": ["T01", "T07"],
  "act-6": ["T01", "T07"],
  "act-7": ["T01", "T07"],
  foreshadowing: ["T04"]
};

const fallbackTheoryMap: Record<OutlineNode["kind"], V1TheoryId[]> = {
  world: ["T13"],
  protagonist: ["T02"],
  antagonist: ["T03", "T13"],
  goldenFinger: ["T11", "T12"],
  conflict: ["T03"],
  act: ["T01", "T07"],
  arcPhase: ["T01", "T07"],
  foreshadowing: ["T04"]
};

const theoryKeywordRules: Record<V1TheoryId, string[]> = {
  T01: ["开局", "关门", "转折", "决战", "收束", "第一幕", "第二幕", "第三幕", "开局篇", "中段篇", "收束篇", "卷", "地图", "副本", "小高潮", "起点", "中点", "终局"],
  T02: ["困境", "心疼", "共情", "软肋", "底层欲望", "压迫", "善意", "执念", "伤口", "弱点"],
  T03: ["目标", "阻碍", "差距", "想要", "必须", "不能", "鸿沟", "对抗", "代价", "危机", "失败", "冲突"],
  T04: ["伏笔", "回收", "兑现", "揭晓", "埋线", "线索", "秘密", "铺垫", "呼应", "引爆", "后文"],
  T07: ["憋屈", "准备", "爆发", "收获", "新危机", "循环", "升级", "扩圈", "地图", "打脸", "反转", "奖励"],
  T11: ["代价", "限制", "反噬", "消耗", "冷却", "交换", "上限", "条件", "副作用", "禁忌", "风险"],
  T12: ["重复", "无敌", "秒杀", "碾压", "天下第一", "麻木", "升级", "同样", "每次", "一直"],
  T13: ["势力", "资源", "规则", "职业", "阶层", "交易", "生态", "动机", "组织", "门派", "家族", "制度"]
};

const conflictGoalKeywords = ["目标", "想要", "追求", "必须", "为了", "执念", "愿望", "需求"];
const conflictObstacleKeywords = ["阻碍", "敌人", "对抗", "不能", "限制", "压迫", "追杀", "竞争", "封锁", "规则"];
const conflictStakesKeywords = ["代价", "失败", "失去", "死亡", "危机", "后果", "牺牲", "风险", "惩罚", "差距", "鸿沟"];
const conflictEscalationKeywords = ["升级", "转折", "反转", "更强", "扩大", "失控", "逼迫", "绝境"];

const powerSourceKeywords = ["来源", "获得", "觉醒", "系统", "血脉", "传承", "法宝", "能力", "天赋", "外挂"];
const powerBoundaryKeywords = ["代价", "限制", "反噬", "消耗", "冷却", "交换", "上限", "条件", "副作用", "禁忌", "风险"];
const powerProgressionKeywords = ["升级", "阶段", "等级", "熟练", "解锁", "突破", "进阶", "成长"];

const foreshadowSeedKeywords = ["伏笔", "埋线", "线索", "秘密", "铺垫", "异常", "疑点", "预兆", "暗示"];
const foreshadowPayoffKeywords = ["回收", "兑现", "揭晓", "呼应", "引爆", "后文", "反转", "真相", "揭开"];

const worldFactionKeywords = ["势力", "组织", "门派", "家族", "王朝", "公司", "学院", "阵营", "联盟"];
const worldRuleKeywords = ["规则", "制度", "法律", "禁忌", "秩序", "等级", "阶层", "体系", "约束"];
const worldResourceKeywords = ["资源", "灵石", "货币", "能源", "土地", "药材", "功法", "名额", "稀缺"];
const worldRoleKeywords = ["职业", "身份", "阶层", "普通人", "修士", "猎人", "商人", "官员", "学生"];
const worldConflictKeywords = ["争夺", "垄断", "压迫", "交易", "竞争", "战争", "剥削", "冲突", "利益"];

const protagonistEmpathyKeywords = ["困境", "心疼", "共情", "软肋", "底层欲望", "压迫", "善意", "伤口", "弱点", "不服输"];
const actStructureKeywords = ["开局", "关门", "转折", "决战", "收束", "起点", "中点", "终局", "目标", "开局篇", "中段篇", "收束篇", "卷", "地图", "副本", "小高潮"];
const rhythmCycleKeywords = ["憋屈", "准备", "爆发", "收获", "新危机", "循环", "升级", "扩圈", "地图", "副本", "势力", "资源", "打脸", "奖励", "反转"];

const theoryRescueDefaults: Record<V1TheoryId, string[]> = {
  T01: ["补起点和关门点", "写清中期转折", "确认结局收束方向"],
  T02: ["补主角困境", "补读者心疼点", "写清主角底层欲望"],
  T03: ["写清主角目标", "补现实阻碍", "制造期望和现实的差距"],
  T04: ["列出伏笔", "标注回收节点", "把伏笔和核心冲突绑定"],
  T07: ["补憋屈情节", "设计爆发时刻", "追加收获后的新危机"],
  T11: ["补力量来源", "补使用代价", "设置限制或反噬"],
  T12: ["换一种爽点", "提高挑战差异", "让奖励升级或变形"],
  T13: ["补主要势力", "补稀缺资源", "说明规则如何影响角色"]
};

const theorySuggestMessages: Record<V1TheoryId, string> = {
  T01: "当前节点和卷纲结构有关，建议检查本卷目标、关门点、小高潮和下一卷钩子是否清楚。",
  T02: "当前节点和主角共情有关，建议检查读者是否有理由站在主角这边。",
  T03: "当前节点和冲突发动有关，建议检查目标、阻碍和落差是否足够明确。",
  T04: "当前节点和伏笔回收有关，建议检查埋线后面是否有兑现计划。",
  T07: "当前节点和爽点节奏有关，建议检查压制、准备、爆发、收获、新危机是否能在本卷成环。",
  T11: "当前节点和力量边界有关，建议检查金手指是否有代价、限制或反噬。",
  T12: "当前节点和满足感衰减有关，建议检查爽点是否重复。",
  T13: "当前节点和世界生态有关，建议检查势力、资源、规则和角色目标是否自洽。"
};

const scoreByLevel: Record<TheoryMatchLevel, number> = {
  needs_fix: 0,
  suggest_check: 1,
  hidden: 2
};

const severityScore: Record<TheorySeverity, number> = {
  fail: 40,
  warning: 25,
  pass: 5
};

export const getRelevantTheoryIdsForNode = (node: OutlineNode | undefined): V1TheoryId[] => {
  if (!node) return [];
  return nodeTheoryMap[node.id] ?? fallbackTheoryMap[node.kind];
};

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const countKeywordGroups = (text: string, groups: string[][]) =>
  groups.filter((keywords) => hasAnyKeyword(text, keywords)).length;

const getMissingLabels = (text: string, checks: Array<{ label: string; keywords: string[] }>) =>
  checks
    .filter((check) => !hasAnyKeyword(text, check.keywords))
    .map((check) => check.label);

const hasCausalLink = (text: string) =>
  hasAnyKeyword(text, ["因为", "所以", "导致", "因此", "为了", "于是", "但", "却", "然而", "结果", "代价", "后果"]);

const hasListLikeDetail = (text: string) =>
  /[1-9一二三四五六七八九十][、.．]/.test(text) || /[；;、，,]/.test(text);

const addReason = (reasons: TheoryMatchReason[], reason: TheoryMatchReason) => {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
};

const getContentGapMessage = (node: OutlineNode | undefined, theoryId: V1TheoryId): string | null => {
  if (!node) return null;
  const content = node.content.trim();

  if (!content) {
    return `当前「${getOutlineNodeDisplayTitle(node)}」还没有内容，先补基础信息再判断这个理论点。`;
  }

  if (content.length < 20) {
    return `当前「${getOutlineNodeDisplayTitle(node)}」内容偏短，可能还看不出完整的因果、限制或推进。`;
  }

  if ((node.kind === "world" || node.kind === "goldenFinger" || node.kind === "conflict") && !hasCausalLink(content)) {
    return `当前「${getOutlineNodeDisplayTitle(node)}」有概念，但还缺“因为/所以/代价/后果”这类因果关系。`;
  }

  if (theoryId === "T11" && node.kind === "goldenFinger") {
    const missing = getMissingLabels(content, [
      { label: "力量来源", keywords: powerSourceKeywords },
      { label: "代价或限制", keywords: powerBoundaryKeywords }
    ]);
    if (missing.length > 0) {
      return `力量体系还缺：${missing.join("、")}。`;
    }
  }

  if (theoryId === "T03" && (node.kind === "conflict" || node.kind === "antagonist")) {
    const missing = getMissingLabels(content, [
      { label: "主角/反派目标", keywords: conflictGoalKeywords },
      { label: "现实阻碍", keywords: conflictObstacleKeywords },
      { label: "失败代价", keywords: conflictStakesKeywords }
    ]);
    if (missing.length > 0) {
      return `冲突还缺：${missing.join("、")}。`;
    }
  }

  if (theoryId === "T13" && (node.kind === "world" || node.kind === "antagonist")) {
    const coveredGroups = countKeywordGroups(content, [
      worldFactionKeywords,
      worldRuleKeywords,
      worldResourceKeywords,
      worldRoleKeywords,
      worldConflictKeywords
    ]);
    if (coveredGroups < 2) {
      return "当前内容有设定感，但还没看到势力、资源、规则、职业或利益冲突形成生态。";
    }
  }

  if (theoryId === "T04" && node.kind === "foreshadowing") {
    const missing = getMissingLabels(content, [
      { label: "埋下什么", keywords: foreshadowSeedKeywords },
      { label: "何时回收", keywords: foreshadowPayoffKeywords }
    ]);
    if (missing.length > 0) {
      return `伏笔计划还缺：${missing.join("、")}。`;
    }
  }

  if ((theoryId === "T07" && (node.kind === "act" || node.kind === "arcPhase")) && countKeywordGroups(content, [["憋屈", "压制", "吃亏"], ["爆发", "打脸", "反击"], ["收获", "奖励", "升级"], ["新危机", "反转", "追杀"]]) < 2) {
    return node.kind === "arcPhase" ? "当前阶段还没看到清晰的爽点循环。" : "当前篇章还没看到清晰的爽点循环。";
  }

  if (theoryId === "T02" && node.kind === "protagonist" && !hasAnyKeyword(content, protagonistEmpathyKeywords)) {
    return "主角设定已有内容，但还没看到足够明确的共情入口。";
  }

  if (theoryId === "T01" && (node.kind === "act" || node.kind === "arcPhase") && !hasAnyKeyword(content, actStructureKeywords)) {
    return node.kind === "arcPhase" ? "阶段已有内容，但还没看到明确的推进功能。" : "篇章已有内容，但还没看到明确的结构节点。";
  }

  if (content.length < 48 && !hasListLikeDetail(content)) {
    return `当前「${getOutlineNodeDisplayTitle(node)}」还是一句概念，建议补至少两条可执行细节。`;
  }

  return null;
};

const checkT01 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const act1 = project.outlineNodes.find((n) => n.id === "act-1");
  const act1PhaseText = project.outlineNodes
    .filter((node) => node.parentId === "act-1")
    .map((node) => `${node.title}\n${node.content}\n${node.metadata?.readerQuestion ?? ""}\n${node.metadata?.chapterHook ?? ""}`)
    .join("\n");
  const act1Text = `${act1?.content ?? ""}\n${act1PhaseText}`;
  if (!act1 || !act1Text.trim()) {
    return {
      theoryId: "T01",
      severity: "warning",
      location: "开局篇",
      message: "开局篇内容为空，建议完善黄金开局和开局关门。",
      rescueOptions: ["添加主角出场场景", "设计救猫咪时刻", "明确开局关门事件"]
    };
  }
  const missing = getMissingLabels(act1Text, [
    { label: "黄金开局", keywords: ["开局", "起点", "出场", "第一章", "钩子"] },
    { label: "开局关门", keywords: ["关门", "转折", "不得不", "被迫", "离开", "选择"] }
  ]);
  if (missing.length > 0) {
    return {
      theoryId: "T01",
      severity: "warning",
      location: "开局篇",
      message: `开局篇缺少明确的${missing.join("和")}设计。`,
      rescueOptions: ["添加黄金开局设计", "设计开局关门事件", "明确主角目标"]
    };
  }
  return null;
};

const checkT02 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const protagonist = project.outlineNodes.find((n) => n.id === "protagonist");
  if (!protagonist || !protagonist.content?.trim()) {
    return {
      theoryId: "T02",
      severity: "warning",
      location: "主角设定",
      message: "主角设定为空，建议添加让读者共情的元素。",
      rescueOptions: ["添加主角困境", "设计救猫咪时刻", "描述主角的底层欲望"]
    };
  }
  if (!hasAnyKeyword(protagonist.content, protagonistEmpathyKeywords)) {
    return {
      theoryId: "T02",
      severity: "warning",
      location: "主角设定",
      message: "主角设定已有内容，但还缺明确的共情入口。",
      rescueOptions: ["添加让读者心疼的细节", "设计主角的软肋"]
    };
  }
  return null;
};

const checkT03 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const conflict = project.outlineNodes.find((n) => n.id === "core-conflict");
  if (!conflict || !conflict.content?.trim()) {
    return {
      theoryId: "T03",
      severity: "fail",
      location: "核心冲突",
      message: "核心冲突为空，故事缺少发动机。",
      rescueOptions: ["明确主角想要什么", "设计阻碍", "制造期望与现实的差距"]
    };
  }
  const missing = getMissingLabels(conflict.content, [
    { label: "主角想要什么", keywords: conflictGoalKeywords },
    { label: "谁或什么在阻碍", keywords: conflictObstacleKeywords },
    { label: "失败会付出什么代价", keywords: conflictStakesKeywords }
  ]);
  if (missing.length > 0) {
    return {
      theoryId: "T03",
      severity: "warning",
      location: "核心冲突",
      message: `核心冲突还缺：${missing.join("、")}。`,
      rescueOptions: ["明确主角的期望", "设计现实的阻碍", "写清失败代价"]
    };
  }
  return null;
};

const checkT04 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const foreshadowing = project.outlineNodes.find((n) => n.id === "foreshadowing");
  if (!foreshadowing || !foreshadowing.content?.trim()) {
    return {
      theoryId: "T04",
      severity: "warning",
      location: "伏笔与回收",
      message: "未记录伏笔，建议规划伏笔与回收节点。",
      rescueOptions: ["列出已埋下的设定", "规划回收节点", "检查是否有未回收的伏笔"]
    };
  }
  const missing = getMissingLabels(foreshadowing.content, [
    { label: "埋下什么", keywords: foreshadowSeedKeywords },
    { label: "何时回收", keywords: foreshadowPayoffKeywords }
  ]);
  if (missing.length > 0) {
    return {
      theoryId: "T04",
      severity: "warning",
      location: "伏笔与回收",
      message: `伏笔已有记录，但还缺：${missing.join("、")}。`,
      rescueOptions: ["标注在哪个阶段回收", "写清揭晓方式", "把伏笔和核心冲突绑定"]
    };
  }
  return null;
};

const checkT07 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const serialNodes = project.outlineNodes.filter((node) => node.kind === "act" || node.kind === "arcPhase");
  const serialText = serialNodes
    .map((node) => `${node.content}\n${node.metadata?.payoffBeat ?? ""}\n${node.metadata?.chapterHook ?? ""}`)
    .join("\n");

  if (serialNodes.length === 0 || !serialText.trim()) {
    return {
      theoryId: "T07",
      severity: "warning",
      location: "卷纲",
      message: "卷纲内容为空，建议设计长篇爽点循环链。",
      rescueOptions: ["设计压制→准备→爆发循环", "添加收获后的新危机", "规划升级地图或副本"]
    };
  }
  const cycleGroups = countKeywordGroups(serialText, [
    ["憋屈", "压制", "吃亏", "羞辱"],
    ["准备", "布局", "修炼", "蓄力"],
    ["爆发", "打脸", "反击", "翻盘"],
    ["收获", "奖励", "升级", "战利品"],
    ["新危机", "反转", "追杀", "更强"],
    ["新地图", "副本", "势力争夺", "资源争夺"]
  ]);
  if (cycleGroups < 3) {
    return {
      theoryId: "T07",
      severity: "warning",
      location: "卷纲",
      message: "卷纲已有内容，但爽点循环链还不完整。",
      rescueOptions: ["添加压制或吃亏情节", "设计爆发时刻", "规划新地图、新副本或新危机"]
    };
  }
  return null;
};

const checkT11 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const power = project.outlineNodes.find((n) => n.id === "golden-finger");
  if (!power || !power.content?.trim()) {
    return {
      theoryId: "T11",
      severity: "warning",
      location: "金手指/力量体系",
      message: "力量体系为空，建议明确代价和限制。",
      rescueOptions: ["明确力量来源", "设计使用代价", "添加限制条件"]
    };
  }
  const missing = getMissingLabels(power.content, [
    { label: "力量来源", keywords: powerSourceKeywords },
    { label: "代价或限制", keywords: powerBoundaryKeywords }
  ]);
  if (missing.length > 0) {
    return {
      theoryId: "T11",
      severity: "warning",
      location: "金手指/力量体系",
      message: `力量体系还缺：${missing.join("、")}。`,
      rescueOptions: ["补清力量来源", "添加使用代价", "设置限制或反噬"]
    };
  }
  return null;
};

const checkT12 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const power = project.outlineNodes.find((n) => n.id === "golden-finger");
  if (!power || !power.content?.trim()) {
    return null;
  }
  const repeatedPatterns = ["无敌", "秒杀", "碾压", "天下第一", "一直赢", "每次都", "重复", "同样"];
  const hasRepeated = repeatedPatterns.some((pattern) => power.content?.includes(pattern));
  const hasProgression = hasAnyKeyword(power.content, powerProgressionKeywords);
  if (hasRepeated && !hasProgression) {
    return {
      theoryId: "T12",
      severity: "warning",
      location: "金手指/力量体系",
      message: "力量体系描述过于重复，读者会麻木。",
      rescueOptions: ["添加差异化战斗方式", "设计新挑战", "引入新限制"]
    };
  }
  return null;
};

const checkT13 = (project: TheoryCheckContext): TheoryCheckResult | null => {
  const world = project.outlineNodes.find((n) => n.id === "world");
  const antagonist = project.outlineNodes.find((n) => n.id === "antagonist");
  if (!world || !world.content?.trim()) {
    return {
      theoryId: "T13",
      severity: "warning",
      location: "世界生态",
      message: "世界观为空，势力、规则和职业还没有落到生态位上。",
      rescueOptions: ["补充主要势力", "写清世界规则", "说明关键职业或资源的存在理由"]
    };
  }
  const worldGroups = countKeywordGroups(world.content, [
    worldFactionKeywords,
    worldRuleKeywords,
    worldResourceKeywords,
    worldRoleKeywords,
    worldConflictKeywords
  ]);
  if (worldGroups < 2) {
    return {
      theoryId: "T13",
      severity: "warning",
      location: "世界生态",
      message: "世界观已有概念，但势力、资源、规则、职业和利益冲突还没有形成生态。",
      rescueOptions: ["补一组主要势力", "明确稀缺资源", "说明规则如何影响普通人和主角"]
    };
  }
  if (!antagonist || !antagonist.content?.trim()) {
    return {
      theoryId: "T13",
      severity: "warning",
      location: "反派/压力源",
      message: "反派/压力源为空，建议先写清开局阶段压住主角的力量。",
      rescueOptions: ["明确阶段性压力来源", "设计压力源的目标或立场", "给压力源不可替代的位置"]
    };
  }
  if (!hasAnyKeyword(antagonist.content, [...conflictGoalKeywords, "动机", "理由", "立场", "利益"])) {
    return {
      theoryId: "T13",
      severity: "warning",
      location: "反派/压力源",
      message: "反派/压力源已有内容，但还缺足够合理的目标或立场。",
      rescueOptions: ["给压力源一个合理动机", "设计阶段反派的立场"]
    };
  }
  return null;
};

const CHECKERS: Record<TheoryId, (project: TheoryCheckContext) => TheoryCheckResult | null> = {
  T01: checkT01,
  T02: checkT02,
  T03: checkT03,
  T04: checkT04,
  T05: () => null,
  T06: () => null,
  T07: checkT07,
  T08: () => null,
  T09: () => null,
  T10: () => null,
  T11: checkT11,
  T12: checkT12,
  T13: checkT13,
  T14: () => null,
  T15: () => null,
  T16: () => null,
  T17: () => null,
  T18: () => null,
  T19: () => null,
  T20: () => null,
  T21: () => null,
  T22: () => null,
  T23: () => null,
  T24: () => null,
  T25: () => null,
  T26: () => null,
  T27: () => null,
  T28: () => null,
  T29: () => null,
  T30: () => null
};

export const runTheoryChecks = (project: TheoryCheckContext): TheoryCheckResult[] => {
  return v1Theories
    .map((theory) => {
      const checker = CHECKERS[theory.id];
      if (!checker) return null;
      return checker(project);
    })
    .filter((result): result is TheoryCheckResult => result !== null);
};

export const matchTheorySuggestions = (
  project: TheoryCheckContext,
  selectedNodeId: string | null
): TheoryMatch[] => {
  const selectedNode = selectedNodeId
    ? project.outlineNodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const selectedNodeText = selectedNode ? `${selectedNode.title}\n${selectedNode.content}` : "";
  const relevantTheoryIds = getRelevantTheoryIdsForNode(selectedNode);
  const checkResultByTheoryId = new Map(
    runTheoryChecks(project).map((result) => [result.theoryId, result])
  );

  return v1Theories
    .map((theory): TheoryMatch => {
      const theoryId = theory.id as V1TheoryId;
      const checkResult = checkResultByTheoryId.get(theoryId);
      const relevant = relevantTheoryIds.includes(theoryId);
      const keywordHit = selectedNode ? hasAnyKeyword(selectedNodeText, theoryKeywordRules[theoryId]) : false;
      const contentGapMessage = relevant ? getContentGapMessage(selectedNode, theoryId) : null;
      const reasons: TheoryMatchReason[] = [];
      let level: TheoryMatchLevel = "hidden";
      let score = 0;
      let severity: TheorySeverity | undefined;
      let location = selectedNode?.title ?? "全局大纲";
      let message = theorySuggestMessages[theoryId];
      let rescueOptions = theoryRescueDefaults[theoryId];

      if (checkResult) {
        severity = checkResult.severity;
        location = checkResult.location;
        message = checkResult.message;
        rescueOptions = checkResult.rescueOptions;
        score += severityScore[checkResult.severity];

        if (checkResult.severity === "fail") {
          level = "needs_fix";
          addReason(reasons, "rule_fail");
        } else if (checkResult.severity === "warning") {
          level = "needs_fix";
          addReason(reasons, "rule_warning");
        }
      }

      if (relevant) {
        score += 40;
        addReason(reasons, "node_relevant");
        if (level === "hidden") {
          level = "suggest_check";
        }
      }

      if (keywordHit) {
        score += 15;
        addReason(reasons, "keyword_hit");
        if (level === "hidden") {
          level = "suggest_check";
          location = selectedNode?.title ?? location;
          message = `当前节点出现了「${theoryKeywordRules[theoryId].find((keyword) => selectedNodeText.includes(keyword))}」相关表达，建议顺手复查这个理论点。`;
        }
      }

      if (contentGapMessage) {
        score += 30;
        addReason(reasons, "content_gap");
        if (level === "hidden") {
          level = "suggest_check";
        }
        if (!checkResult || checkResult.severity === "pass") {
          location = selectedNode?.title ?? location;
          message = contentGapMessage;
          rescueOptions = theoryRescueDefaults[theoryId];
        }
      }

      return {
        theoryId,
        level,
        ...(severity ? { severity } : {}),
        location,
        reasons,
        message,
        rescueOptions,
        score
      };
    })
    .sort((a, b) => {
      const levelDelta = scoreByLevel[a.level] - scoreByLevel[b.level];
      if (levelDelta !== 0) return levelDelta;
      if (b.score !== a.score) return b.score - a.score;
      return a.theoryId.localeCompare(b.theoryId);
    });
};

export const runTheoryChecksWithExplanations = async (project: Project): Promise<TheoryCheckWithExplanation[]> => {
  const results = runTheoryChecks(project);
  const explanations = await Promise.all(
    results.map(async (result) => {
      const theory = getTheoryById(result.theoryId);
      const explanation = await llmProvider.explainTheoryCheck({
        theoryId: result.theoryId,
        status: result.severity,
        location: result.location,
        reason: result.message,
        evidence: []
      });
      return {
        ...result,
        theory: theory!,
        ...explanation
      };
    })
  );
  return explanations;
};

export const getSeverityColor = (severity: TheorySeverity): string => {
  switch (severity) {
    case "pass":
      return "#1e705d";
    case "warning":
      return "#805600";
    case "fail":
      return "#9a291a";
    default:
      return "#6f695e";
  }
};

export const getSeverityLabel = (severity: TheorySeverity): string => {
  switch (severity) {
    case "pass":
      return "通过";
    case "warning":
      return "警告";
    case "fail":
      return "失败";
    default:
      return "未知";
  }
};
