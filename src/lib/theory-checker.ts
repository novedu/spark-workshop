import type { Project, TheoryCheckResult, TheoryDefinition, TheoryId, TheorySeverity } from "@/types/product";
import { v1Theories, getTheoryById } from "./theory-library";
import { llmProvider } from "./llm";

export type TheoryCheckWithExplanation = TheoryCheckResult & {
  theory: TheoryDefinition;
  plainExplanation: string;
  theoryExplanation: string;
  suggestions: string[];
  canIgnore: boolean;
};

const checkT01 = (project: Project): TheoryCheckResult | null => {
  const act1 = project.outlineNodes.find((n) => n.id === "act-1");
  if (!act1 || !act1.content?.trim()) {
    return {
      theoryId: "T01",
      severity: "warning",
      location: "第一幕",
      message: "第一幕内容为空，建议完善黄金开局和第一幕关门。",
      rescueOptions: ["添加主角出场场景", "设计救猫咪时刻", "明确第一幕关门事件"]
    };
  }
  if (!act1.content.includes("开局") && !act1.content.includes("关门")) {
    return {
      theoryId: "T01",
      severity: "warning",
      location: "第一幕",
      message: "第一幕缺少明确的开局和关门设计。",
      rescueOptions: ["添加黄金开局设计", "设计第一幕关门事件", "明确主角目标"]
    };
  }
  return null;
};

const checkT02 = (project: Project): TheoryCheckResult | null => {
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
  if (!protagonist.content.includes("困境") && !protagonist.content.includes("心疼") && !protagonist.content.includes("共情")) {
    return {
      theoryId: "T02",
      severity: "pass",
      location: "主角设定",
      message: "主角设定已完善，建议检查是否有让读者心疼的元素。",
      rescueOptions: ["添加让读者心疼的细节", "设计主角的软肋"]
    };
  }
  return null;
};

const checkT03 = (project: Project): TheoryCheckResult | null => {
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
  if (!conflict.content.includes("想要") && !conflict.content.includes("阻碍") && !conflict.content.includes("差距")) {
    return {
      theoryId: "T03",
      severity: "warning",
      location: "核心冲突",
      message: "核心冲突缺少期望与现实的差距。",
      rescueOptions: ["明确主角的期望", "设计现实的阻碍", "制造鸿沟"]
    };
  }
  return null;
};

const checkT04 = (project: Project): TheoryCheckResult | null => {
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
  return null;
};

const checkT07 = (project: Project): TheoryCheckResult | null => {
  const act2 = project.outlineNodes.find((n) => n.id === "act-2");
  if (!act2 || !act2.content?.trim()) {
    return {
      theoryId: "T07",
      severity: "warning",
      location: "第二幕",
      message: "第二幕内容为空，建议设计爽点循环。",
      rescueOptions: ["设计憋屈→准备→爆发循环", "添加收获后的新危机", "规划升级地图"]
    };
  }
  if (!act2.content.includes("循环") && !act2.content.includes("憋屈") && !act2.content.includes("爆发")) {
    return {
      theoryId: "T07",
      severity: "pass",
      location: "第二幕",
      message: "第二幕内容已完善，建议检查爽点循环设计。",
      rescueOptions: ["添加憋屈情节", "设计爆发时刻", "规划新危机"]
    };
  }
  return null;
};

const checkT11 = (project: Project): TheoryCheckResult | null => {
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
  if (!power.content.includes("代价") && !power.content.includes("限制") && !power.content.includes("反噬")) {
    return {
      theoryId: "T11",
      severity: "warning",
      location: "金手指/力量体系",
      message: "力量体系缺少代价或限制，外挂开太大。",
      rescueOptions: ["添加使用代价", "设计反噬机制", "设置力量上限"]
    };
  }
  return null;
};

const checkT12 = (project: Project): TheoryCheckResult | null => {
  const power = project.outlineNodes.find((n) => n.id === "golden-finger");
  if (!power || !power.content?.trim()) {
    return null;
  }
  const repeatedPatterns = ["无敌", "秒杀", "碾压", "天下第一"];
  const hasRepeated = repeatedPatterns.some((pattern) => power.content?.includes(pattern));
  if (hasRepeated) {
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

const checkT13 = (project: Project): TheoryCheckResult | null => {
  const antagonist = project.outlineNodes.find((n) => n.id === "antagonist");
  if (!antagonist || !antagonist.content?.trim()) {
    return {
      theoryId: "T13",
      severity: "warning",
      location: "反派设定",
      message: "反派设定为空，建议给反派一个合理目标。",
      rescueOptions: ["明确反派目标", "设计反派的动机", "给反派不可替代的位置"]
    };
  }
  if (!antagonist.content.includes("目标") && !antagonist.content.includes("动机") && !antagonist.content.includes("理由")) {
    return {
      theoryId: "T13",
      severity: "pass",
      location: "反派设定",
      message: "反派设定已完善，建议检查是否有合理目标。",
      rescueOptions: ["给反派一个合理动机", "设计反派的立场"]
    };
  }
  return null;
};

const CHECKERS: Record<TheoryId, (project: Project) => TheoryCheckResult | null> = {
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

export const runTheoryChecks = (project: Project): TheoryCheckResult[] => {
  return v1Theories
    .map((theory) => {
      const checker = CHECKERS[theory.id];
      if (!checker) return null;
      return checker(project);
    })
    .filter((result): result is TheoryCheckResult => result !== null);
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