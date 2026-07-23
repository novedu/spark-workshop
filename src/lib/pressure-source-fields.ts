import type {
  OutlineNode,
  OutlineNodeMetadata,
  PressureSourceMetadata,
  PressureSourceMetadataKey
} from "@/types/product";

export type PressureSourceFieldDefinition = {
  key: Exclude<PressureSourceMetadataKey, `${string}Stage`>;
  stageKey?: Extract<PressureSourceMetadataKey, `${string}Stage`>;
  label: string;
  shortLabel: string;
  description: string;
  stagePlaceholder?: string;
  placeholder: string;
  multiline?: boolean;
  fullWidth?: boolean;
};

export const pressureSourceFieldDefinitions: PressureSourceFieldDefinition[] = [
  {
    key: "openingPressure",
    stageKey: "openingPressureStage",
    label: "开局压力源",
    shortLabel: "开局",
    description: "前三章就压住主角的人、规则或资源困境，不要求是终极反派。",
    stagePlaceholder: "例如：1-30章 / 开局卷阶段2",
    placeholder: "例如：记忆税务所管事用欠税名义逼主角交出母亲记忆。",
    multiline: true
  },
  {
    key: "stageBoss",
    stageKey: "stageBossStage",
    label: "阶段 boss",
    shortLabel: "阶段",
    description: "当前卷或下一卷真正负责追打主角的具象对手。",
    stagePlaceholder: "例如：31-120章 / 新手升级卷",
    placeholder: "例如：外城区稽查队长，掌握记忆抵扣账本和执法权。",
    multiline: true
  },
  {
    key: "systemPressure",
    stageKey: "systemPressureStage",
    label: "制度 / 势力压力",
    shortLabel: "势力",
    description: "不是某个人，而是持续制造压迫的制度、组织或利益链。",
    stagePlaceholder: "例如：251-450章 / 势力扩张卷",
    placeholder: "例如：记忆税制让底层没有合法身份，税务司和旧族共同维护规则。",
    multiline: true
  },
  {
    key: "finalOpponent",
    stageKey: "finalOpponentStage",
    label: "终局对手",
    shortLabel: "终局",
    description: "可以先写影子或方向，后续随世界状态逐步确认。",
    stagePlaceholder: "例如：851章后 / 终局兑现卷",
    placeholder: "例如：真正改写记忆税源头的规则制定者，暂不完整登场。",
    multiline: true
  },
  {
    key: "pressureEscalation",
    label: "压力升级方式",
    shortLabel: "升级",
    description: "主角每次破局后，压力源如何升级或换层。",
    placeholder: "例如：从管事卡资源，到稽查队封身份，再到税务司修改整城规则。",
    multiline: true,
    fullWidth: true
  }
];

const pressureStageKeys = pressureSourceFieldDefinitions
  .map((definition) => definition.stageKey)
  .filter((key): key is Extract<PressureSourceMetadataKey, `${string}Stage`> => Boolean(key));

const legacyLabelMatchers: Record<PressureSourceMetadataKey, RegExp[]> = {
  openingPressure: [/^(?:开局压力源|开局压力|开局压迫|初始压力源)\s*[：:]\s*(.+)$/m],
  openingPressureStage: [/^(?:开局压力源出场|开局压力出场|开局出场|开局阶段)\s*[：:]\s*(.+)$/m],
  stageBoss: [/^(?:阶段\s*boss|阶段Boss|阶段BOSS|阶段对手|小boss|小Boss|小BOSS)\s*[：:]\s*(.+)$/m],
  stageBossStage: [/^(?:阶段\s*boss出场|阶段Boss出场|阶段BOSS出场|阶段对手出场|阶段boss阶段)\s*[：:]\s*(.+)$/m],
  systemPressure: [/^(?:制度\s*\/\s*势力压力|制度压力|势力压力|系统性压力|组织压力)\s*[：:]\s*(.+)$/m],
  systemPressureStage: [/^(?:制度\s*\/\s*势力压力出场|制度压力出场|势力压力出场|制度阶段|势力阶段)\s*[：:]\s*(.+)$/m],
  finalOpponent: [/^(?:终局对手|最终反派|终极反派|终局压力源|幕后黑手)\s*[：:]\s*(.+)$/m],
  finalOpponentStage: [/^(?:终局对手出场|最终反派出场|终极反派出场|终局阶段)\s*[：:]\s*(.+)$/m],
  pressureEscalation: [/^(?:压力升级方式|升级关系|压力升级|压力链|递进方式)\s*[：:]\s*(.+)$/m]
};

const textValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const parseLegacyPressureSourceMetadata = (content: string): PressureSourceMetadata => {
  const parsed: PressureSourceMetadata = {};

  for (const key of Object.keys(legacyLabelMatchers) as PressureSourceMetadataKey[]) {
    const matcher = legacyLabelMatchers[key].find((pattern) => pattern.test(content));
    const value = matcher ? content.match(matcher)?.[1]?.trim() : "";
    if (value) {
      parsed[key] = value;
    }
  }

  return parsed;
};

export const getPressureSourceMetadata = (node: OutlineNode): PressureSourceMetadata => {
  const legacy = node.kind === "antagonist" ? parseLegacyPressureSourceMetadata(node.content) : {};
  const metadata = node.metadata ?? {};
  const allKeys = [
    ...pressureSourceFieldDefinitions.map((definition) => definition.key),
    ...pressureStageKeys
  ];

  return allKeys.reduce<PressureSourceMetadata>((result, key) => {
    const currentValue = textValue(metadata[key]);
    result[key] = currentValue || legacy[key] || "";
    return result;
  }, {});
};

export const ensurePressureSourceMetadata = (node: OutlineNode): OutlineNode => {
  if (node.kind !== "antagonist") return node;

  const parsed = getPressureSourceMetadata(node);
  const metadata: OutlineNodeMetadata = {
    ...(node.metadata ?? {})
  };

  for (const [key, value] of Object.entries(parsed) as Array<[PressureSourceMetadataKey, string]>) {
    if (!textValue(metadata[key]) && value) {
      metadata[key] = value;
    }
  }

  return {
    ...node,
    metadata
  };
};

export const getPressureSourceFieldEntries = (metadata?: OutlineNodeMetadata) =>
  pressureSourceFieldDefinitions.map((definition) => ({
    ...definition,
    value: textValue(metadata?.[definition.key]),
    stageValue: definition.stageKey ? textValue(metadata?.[definition.stageKey]) : ""
  }));

export const getFilledPressureSourceFieldCount = (metadata?: OutlineNodeMetadata) =>
  getPressureSourceFieldEntries(metadata).filter((entry) => entry.value.length > 0).length;
