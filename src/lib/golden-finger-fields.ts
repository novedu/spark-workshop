import type {
  GoldenFingerMetadata,
  GoldenFingerMetadataKey,
  OutlineNode,
  OutlineNodeMetadata
} from "@/types/product";

export type GoldenFingerFieldDefinition = {
  key: GoldenFingerMetadataKey;
  label: string;
  description: string;
  placeholder: string;
  multiline?: boolean;
  fullWidth?: boolean;
};

export const goldenFingerFieldDefinitions: GoldenFingerFieldDefinition[] = [
  {
    key: "abilityCore",
    label: "能力核心",
    description: "金手指真正让主角赢的机制，不只是名字或设定名词。",
    placeholder: "例如：主角能读取记忆残片，并临时借用其中一项能力。",
    multiline: true,
    fullWidth: true
  },
  {
    key: "limitation",
    label: "限制条件",
    description: "什么情况下不能用、不能连续用，或需要满足什么前置条件。",
    placeholder: "例如：必须接触承载记忆的物品，且同一段记忆只能读取一次。",
    multiline: true
  },
  {
    key: "cost",
    label: "使用代价",
    description: "每次爽点兑现时，主角要付出的具体代价。",
    placeholder: "例如：使用后会忘掉一段与亲近之人相关的真实经历。",
    multiline: true
  },
  {
    key: "upgradePath",
    label: "升级方式",
    description: "能力如何随卷或阶段升级，升级需要资源、选择或代价。",
    placeholder: "例如：夺回越高阶的记忆档案，能读取的能力层级越高。",
    multiline: true
  },
  {
    key: "backlashRisk",
    label: "失控风险",
    description: "能力开太大后会怎样反噬主角、关系或世界规则。",
    placeholder: "例如：读取过量会混淆自我记忆，甚至把敌人的欲望当成自己的。",
    multiline: true
  }
];

const legacyLabelMatchers: Record<GoldenFingerMetadataKey, RegExp[]> = {
  abilityCore: [/^(?:能力核心|核心能力|能力机制|金手指能力|来源)\s*[：:]\s*(.+)$/m],
  limitation: [/^(?:限制条件|限制|使用限制|边界|升级边界)\s*[：:]\s*(.+)$/m],
  cost: [/^(?:使用代价|代价|成本|消耗)\s*[：:]\s*(.+)$/m],
  upgradePath: [/^(?:升级方式|升级路径|成长方式|进阶方式)\s*[：:]\s*(.+)$/m],
  backlashRisk: [/^(?:失控风险|反噬|反噬风险|风险|副作用)\s*[：:]\s*(.+)$/m]
};

const textValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const parseLegacyGoldenFingerMetadata = (content: string): GoldenFingerMetadata => {
  const parsed: GoldenFingerMetadata = {};

  for (const definition of goldenFingerFieldDefinitions) {
    const matcher = legacyLabelMatchers[definition.key].find((pattern) => pattern.test(content));
    const value = matcher ? content.match(matcher)?.[1]?.trim() : "";
    if (value) {
      parsed[definition.key] = value;
    }
  }

  return parsed;
};

export const getGoldenFingerMetadata = (node: OutlineNode): GoldenFingerMetadata => {
  const legacy = node.kind === "goldenFinger" ? parseLegacyGoldenFingerMetadata(node.content) : {};
  const metadata = node.metadata ?? {};

  return goldenFingerFieldDefinitions.reduce<GoldenFingerMetadata>((result, definition) => {
    const currentValue = textValue(metadata[definition.key]);
    result[definition.key] = currentValue || legacy[definition.key] || "";
    return result;
  }, {});
};

export const ensureGoldenFingerMetadata = (node: OutlineNode): OutlineNode => {
  if (node.kind !== "goldenFinger") return node;

  const parsed = getGoldenFingerMetadata(node);
  const metadata: OutlineNodeMetadata = {
    ...(node.metadata ?? {})
  };

  for (const definition of goldenFingerFieldDefinitions) {
    if (!textValue(metadata[definition.key]) && parsed[definition.key]) {
      metadata[definition.key] = parsed[definition.key];
    }
  }

  return {
    ...node,
    metadata
  };
};

export const getGoldenFingerFieldEntries = (metadata?: OutlineNodeMetadata) =>
  goldenFingerFieldDefinitions.map((definition) => ({
    ...definition,
    value: textValue(metadata?.[definition.key])
  }));

export const getFilledGoldenFingerFieldCount = (metadata?: OutlineNodeMetadata) =>
  getGoldenFingerFieldEntries(metadata).filter((entry) => entry.value.length > 0).length;
