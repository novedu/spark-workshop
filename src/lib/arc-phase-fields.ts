import type { ArcPhaseMetadataKey, ArcPhaseRole, OutlineNodeMetadata } from "@/types/product";

export type ArcPhaseFieldDefinition = {
  key: ArcPhaseMetadataKey;
  label: string;
  description: string;
};

export const arcPhaseRoleLabels: Record<ArcPhaseRole, string> = {
  setup: "立局",
  pressure: "加压",
  turning: "转折",
  payoff: "兑现",
  hook: "钩子"
};

export const arcPhaseFieldDefinitions: ArcPhaseFieldDefinition[] = [
  {
    key: "readerQuestion",
    label: "读者问题",
    description: "这一阶段让读者追问什么。"
  },
  {
    key: "pressureSource",
    label: "当前压力源",
    description: "这一阶段持续压住主角的人、规则或资源限制。"
  },
  {
    key: "payoffBeat",
    label: "爽点兑现",
    description: "这一阶段要兑现的反击、打脸、揭露或情绪债。"
  },
  {
    key: "chapterHook",
    label: "阶段钩子",
    description: "阶段末尾把读者拉向下一段的问题或危机。"
  },
  {
    key: "stateChange",
    label: "状态变化",
    description: "这一阶段结束后，人物、关系、资源或世界规则发生的变化。"
  }
];

export const getArcPhaseRoleLabel = (value: unknown) => {
  if (typeof value !== "string") return "";
  return arcPhaseRoleLabels[value as ArcPhaseRole] ?? value;
};

export const getArcPhaseFieldEntries = (metadata?: OutlineNodeMetadata) =>
  arcPhaseFieldDefinitions
    .map((definition) => {
      const value = metadata?.[definition.key];
      const text = typeof value === "string" ? value.trim() : "";

      return {
        ...definition,
        value: text
      };
    })
    .filter((entry) => entry.value.length > 0);

