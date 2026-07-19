import type { OutlineNodeMetadata, SerialArcMetadataKey } from "@/types/product";

export type SerialArcFieldDefinition = {
  key: Exclude<SerialArcMetadataKey, "chapterRange">;
  label: string;
  description: string;
};

export const serialArcFieldDefinitions: SerialArcFieldDefinition[] = [
  {
    key: "volumeGoal",
    label: "卷目标",
    description: "这一卷要让主角完成的阶段性目标。"
  },
  {
    key: "mapLayer",
    label: "地图/圈层",
    description: "这一卷打开的新场景、新圈层或新规则。"
  },
  {
    key: "pressureSource",
    label: "阶段压力源",
    description: "这一卷持续压住主角的人、组织、制度或资源限制。"
  },
  {
    key: "upgradeResource",
    label: "升级资源",
    description: "这一卷争夺或消耗的能力、身份、道具、情报或人脉。"
  },
  {
    key: "miniClimax",
    label: "小高潮",
    description: "这一卷最关键的一次爆发、反杀、揭露或阶段 boss 战。"
  },
  {
    key: "nextVolumeHook",
    label: "卷末钩子",
    description: "把读者拉去下一卷的新危机、新地图或新真相。"
  }
];

export const getSerialArcFieldEntries = (metadata?: OutlineNodeMetadata) =>
  serialArcFieldDefinitions
    .map((definition) => {
      const value = metadata?.[definition.key];
      const text = typeof value === "string" ? value.trim() : "";

      return {
        ...definition,
        value: text
      };
    })
    .filter((entry) => entry.value.length > 0);
