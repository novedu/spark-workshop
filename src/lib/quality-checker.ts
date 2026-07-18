import { getNodeEmotionGoal } from "./emotion-goals";
import type { OutlineNode } from "@/types/product";

export type QualityCheckId = "opening-hook" | "chapter-end-pull" | "scene-writability" | "serial-continuity";
export type QualityCheckSeverity = "pass" | "warning" | "fail";

export type QualityCheckResult = {
  id: QualityCheckId;
  title: string;
  severity: QualityCheckSeverity;
  location: string;
  message: string;
  suggestions: string[];
};

type QualityCheckContext = {
  outlineNodes: OutlineNode[];
};

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const joinNodeText = (nodes: OutlineNode[]) =>
  nodes
    .map((node) => `${node.title}\n${node.content}\n${node.emotionGoal?.promise ?? ""}`)
    .join("\n");

const getNode = (nodes: OutlineNode[], id: string) => nodes.find((node) => node.id === id);
const getSerialNodes = (nodes: OutlineNode[]) => nodes.filter((node) => node.kind === "act");

const getCheckSeverity = (hasHardGap: boolean, hasSoftGap: boolean): QualityCheckSeverity => {
  if (hasHardGap) return "fail";
  if (hasSoftGap) return "warning";
  return "pass";
};

const checkOpeningHook = (nodes: OutlineNode[]): QualityCheckResult => {
  const world = getNode(nodes, "world");
  const protagonist = getNode(nodes, "protagonist");
  const act1 = getNode(nodes, "act-1");
  const text = joinNodeText([world, protagonist, act1].filter((node): node is OutlineNode => Boolean(node)));
  const hasHook = hasAnyKeyword(text, ["开篇钩子", "钩子", "第一章", "开局", "异常", "困境", "压迫", "选择", "危机"]);
  const hasEmpathy = hasAnyKeyword(text, ["心疼", "共情", "底层欲望", "困境", "软肋", "不服输", "被迫", "牺牲"]);
  const hasVisibleEvent = hasAnyKeyword(text, ["发现", "遭遇", "被迫", "觉醒", "逃", "反击", "揭晓", "失去", "选择"]);
  const missing: string[] = [];

  if (!hasHook) missing.push("第一眼钩子");
  if (!hasEmpathy) missing.push("主角共情入口");
  if (!hasVisibleEvent) missing.push("可见开场事件");

  return {
    id: "opening-hook",
    title: "开头抓人",
    severity: getCheckSeverity(!act1?.content.trim(), missing.length > 0),
    location: "故事基底 / 开局篇",
    message:
      missing.length > 0
        ? `开头还缺：${missing.join("、")}。`
        : "开头已经具备钩子、共情入口和可见事件。",
    suggestions: [
      "第一章先给一个异常、压迫或选择，不先解释完整设定。",
      "让主角在开局有可被读者理解的困境或底层欲望。",
      "把世界观规则落到一个当场发生的事件上。"
    ]
  };
};

const checkChapterEndPull = (nodes: OutlineNode[]): QualityCheckResult => {
  const act1 = getNode(nodes, "act-1");
  const serialNodes = getSerialNodes(nodes);
  const foreshadowing = getNode(nodes, "foreshadowing");
  const text = joinNodeText([act1, ...serialNodes.slice(1, 3), foreshadowing].filter((node): node is OutlineNode => Boolean(node)));
  const hasDoorClose = hasAnyKeyword(text, ["关门", "不得不", "被迫", "选择", "离开", "暴露", "追杀", "失控"]);
  const hasNextHook = hasAnyKeyword(text, ["新危机", "悬念", "反转", "揭晓", "回收", "引爆", "下一", "后文", "中期转折"]);
  const hasRewardOrThreat = hasAnyKeyword(text, ["奖励", "升级", "收获", "代价", "失败", "失去", "更强", "追杀"]);
  const missing: string[] = [];

  if (!hasDoorClose) missing.push("关门事件");
  if (!hasNextHook) missing.push("下一段追读钩子");
  if (!hasRewardOrThreat) missing.push("奖励或新威胁");

  return {
    id: "chapter-end-pull",
    title: "章末追读",
    severity: getCheckSeverity(!act1?.content.trim() && serialNodes.slice(1).every((node) => !node.content.trim()), missing.length > 0),
    location: "开局卷 / 升级卷 / 伏笔",
    message:
      missing.length > 0
        ? `章末追读还缺：${missing.join("、")}。`
        : "阶段末尾已有选择、悬念和奖励或威胁。",
    suggestions: [
      "每个阶段末尾留下一个不得不继续的选择。",
      "让奖励后面立刻跟一个更大的威胁或反转。",
      "把伏笔回收点放在章末或阶段末制造余味。"
    ]
  };
};

const checkSceneWritability = (nodes: OutlineNode[]): QualityCheckResult => {
  const actionableNodes = nodes.filter((node) => {
    const text = `${node.title}\n${node.content}`;
    return hasAnyKeyword(text, ["场景", "事件", "发现", "遭遇", "选择", "对抗", "交易", "追杀", "反击", "揭晓", "失去"]);
  });
  const shortNodes = nodes.filter((node) => node.content.trim().length < 28);
  const hasEnoughActions = actionableNodes.length >= Math.min(4, nodes.length);
  const missingExamples = shortNodes.slice(0, 3).map((node) => node.title);

  return {
    id: "scene-writability",
    title: "场景可写",
    severity: getCheckSeverity(nodes.length === 0, !hasEnoughActions || shortNodes.length > 2),
    location: "全局大纲",
    message:
      hasEnoughActions && shortNodes.length <= 2
        ? "多数节点已经能看出可落地事件。"
        : `部分节点还像资料卡，缺少可直接写成场景的事件${missingExamples.length > 0 ? `：${missingExamples.join("、")}` : "。"}`,
    suggestions: [
      "每个核心节点至少补一个动作：发现、遭遇、选择、对抗或反击。",
      "把抽象规则改成角色当场付出的代价。",
      "把人物关系落到一次冲突、交易或救援里。"
    ]
  };
};

const checkSerialContinuity = (nodes: OutlineNode[]): QualityCheckResult => {
  const serialNodes = getSerialNodes(nodes);
  const foreshadowing = getNode(nodes, "foreshadowing");
  const text = joinNodeText(serialNodes);
  const emotionGoals = nodes.map(getNodeEmotionGoal);
  const hasProgression = hasAnyKeyword(text, ["升级", "阶段", "地图", "副本", "卷", "小高潮", "新危机", "更强", "解锁", "中期转折", "势力", "资源"]);
  const hasForeshadowPayoff = hasAnyKeyword(foreshadowing?.content ?? "", ["回收", "揭晓", "兑现", "呼应", "引爆", "后文"]);
  const hasEmotionVariety = new Set(emotionGoals.map((goal) => goal.emotion)).size >= 4;
  const hasEnoughArcNodes = serialNodes.length >= 5;
  const missing: string[] = [];

  if (!hasEnoughArcNodes) missing.push("至少 5 个卷/地图节点");
  if (!hasProgression) missing.push("升级、地图或新危机");
  if (!hasForeshadowPayoff) missing.push("伏笔回收计划");
  if (!hasEmotionVariety) missing.push("情绪变化");

  return {
    id: "serial-continuity",
    title: "连载承接",
    severity: getCheckSeverity(serialNodes.length === 0 || serialNodes.every((node) => !node.content.trim()), missing.length > 0),
    location: "卷纲 / 伏笔 / 情绪目标",
    message:
      missing.length > 0
        ? `连载承接还缺：${missing.join("、")}。`
        : "升级、伏笔回收和情绪变化已经能支撑连续追读。",
    suggestions: [
      "长篇至少要有多段卷纲：开局、升级、地图、势力扩张、中期转折和终局兑现。",
      "每卷都要有新目标、新压力源、小高潮和下一卷钩子。",
      "伏笔要写清何时回收，以及回收会改变什么局面。",
      "相邻节点的情绪目标不要完全一样，避免读者麻木。"
    ]
  };
};

export const runQualityChecks = (context: QualityCheckContext): QualityCheckResult[] => {
  const nodes = context.outlineNodes;
  if (nodes.length === 0) {
    return [
      {
        id: "opening-hook",
        title: "开头抓人",
        severity: "fail",
        location: "大纲",
        message: "还没有大纲节点，暂时无法做网文质检。",
        suggestions: ["先引爆灵感并选择一个方案。"]
      }
    ];
  }

  return [
    checkOpeningHook(nodes),
    checkChapterEndPull(nodes),
    checkSceneWritability(nodes),
    checkSerialContinuity(nodes)
  ];
};
