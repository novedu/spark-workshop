import type { LlmResultMeta } from "@/types/product";
import type { AiUsageOperationId } from "./ai-usage-meter";

export type AiOperationProfile = {
  id: AiUsageOperationId;
  name: string;
  necessity: "required" | "manual" | "optional" | "local-first";
  trigger: string;
  tokenUse: string;
  costControl: string;
};

export const llmSourceCopy: Record<LlmResultMeta["source"], { label: string; detail: string }> = {
  llm: {
    label: "真实 AI",
    detail: "已通过服务端代理调用真实模型。"
  },
  cache: {
    label: "缓存结果",
    detail: "复用了本地缓存，没有新增模型调用。"
  },
  mock: {
    label: "本地兜底",
    detail: "真实 AI 暂不可用或被省 token 模式拦截，已使用本地结果。"
  }
};

export const aiOperationProfiles: AiOperationProfile[] = [
  {
    id: "igniteSeed",
    name: "灵感引爆",
    necessity: "required",
    trigger: "点击“引爆”",
    tokenUse: "会调用真实 AI",
    costControl: "相同输入命中缓存；失败时本地兜底。"
  },
  {
    id: "enhanceOutlineNode",
    name: "AI 补写",
    necessity: "manual",
    trigger: "点击节点“AI补写缺口”",
    tokenUse: "会调用真实 AI",
    costControl: "补全后自动保存；超时后本地兜底。"
  },
  {
    id: "generateOpeningChapterPlan",
    name: "前 30 章节奏表",
    necessity: "manual",
    trigger: "点击“生成节奏表”",
    tokenUse: "会调用真实 AI",
    costControl: "调用前确认；失败时使用本地章节模板兜底。"
  },
  {
    id: "generateOpeningChapterDraft",
    name: "正文试写",
    necessity: "required",
    trigger: "点击“AI生成当前章”",
    tokenUse: "会调用真实 AI",
    costControl: "只按单章手动触发；失败保留原稿，不用 mock 冒充正文。"
  },
  {
    id: "fillOpeningChapterGap",
    name: "正文缺口补写",
    necessity: "manual",
    trigger: "点击本地检查项的“AI补写”",
    tokenUse: "会调用真实 AI",
    costControl: "只补一个缺口并先预览；人工采纳后才修改正文。"
  },
  {
    id: "explainTheoryCheck",
    name: "理论解释",
    necessity: "optional",
    trigger: "展开“理论解释”",
    tokenUse: "可能调用真实 AI",
    costControl: "省 token 模式开启后只用本地解释。"
  },
  {
    id: "generateTasteSamples",
    name: "味觉样本",
    necessity: "manual",
    trigger: "进入味觉测试生成样本",
    tokenUse: "可能调用真实 AI",
    costControl: "样本会写入本地缓存。"
  },
  {
    id: "analyzeTastePreference",
    name: "偏好画像",
    necessity: "manual",
    trigger: "提交味觉选择",
    tokenUse: "可能调用真实 AI",
    costControl: "相同选择命中缓存。"
  },
  {
    id: "healthProbe",
    name: "真实探测",
    necessity: "optional",
    trigger: "AI 设置页点击“真实探测”",
    tokenUse: "会调用一次真实 AI",
    costControl: "仅手动触发。"
  }
];

export const aiNecessityCopy: Record<AiOperationProfile["necessity"], { label: string; detail: string }> = {
  required: {
    label: "核心 AI",
    detail: "没有真实 AI 时仍可本地兜底，但产品价值会明显下降。"
  },
  manual: {
    label: "手动 AI",
    detail: "只在用户明确点击或提交时调用。"
  },
  optional: {
    label: "可省",
    detail: "可被省 token 模式或本地规则替代。"
  },
  "local-first": {
    label: "本地优先",
    detail: "默认使用本地规则，不需要真实 AI。"
  }
};
