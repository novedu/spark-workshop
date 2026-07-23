import type { OutlineNode, OutlineNodeMetadata, ProtagonistMetadata, ProtagonistMetadataKey } from "@/types/product";

export type ProtagonistFieldDefinition = {
  key: ProtagonistMetadataKey;
  label: string;
  description: string;
  placeholder: string;
  multiline?: boolean;
  fullWidth?: boolean;
};

export const protagonistFieldDefinitions: ProtagonistFieldDefinition[] = [
  {
    key: "identity",
    label: "姓名 / 身份",
    description: "主角叫什么，以及开局被世界当成什么人。",
    placeholder: "例如：沈砚｜被家族当作可牺牲的废子",
    fullWidth: true
  },
  {
    key: "coreDesire",
    label: "底层欲望",
    description: "主角真正想要的东西，不只是“变强”。",
    placeholder: "例如：证明自己不是可以被随手牺牲的人",
    multiline: true
  },
  {
    key: "openingPredicament",
    label: "开场困境",
    description: "前三章就能被读者看见的具体困境和压力。",
    placeholder: "例如：被安排替嫡系送死，所有人默认他没有选择权",
    multiline: true
  },
  {
    key: "growthArc",
    label: "成长弧线",
    description: "主角从什么状态出发，最后变成怎样的人。",
    placeholder: "例如：从只想活下去，到学会利用规则并主动承担代价",
    multiline: true
  },
  {
    key: "keyRelationships",
    label: "关键关系",
    description: "最先影响主角选择的关系，不做完整关系图。",
    placeholder: "例如：母亲（失踪）｜管事（压迫者）｜旧友（唯一知情者）",
    multiline: true
  }
];

const legacyLabelMatchers: Record<ProtagonistMetadataKey, RegExp[]> = {
  identity: [/^(?:姓名\s*\/\s*身份|姓名|身份)\s*[：:]\s*(.+)$/m],
  coreDesire: [/^底层欲望\s*[：:]\s*(.+)$/m],
  openingPredicament: [/^开场困境\s*[：:]\s*(.+)$/m],
  growthArc: [/^成长弧线\s*[：:]\s*(.+)$/m],
  keyRelationships: [/^(?:关键关系|核心关系)\s*[：:]\s*(.+)$/m]
};

const textValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const parseLegacyProtagonistMetadata = (content: string): ProtagonistMetadata => {
  const parsed: ProtagonistMetadata = {};

  for (const definition of protagonistFieldDefinitions) {
    const matcher = legacyLabelMatchers[definition.key].find((pattern) => pattern.test(content));
    const value = matcher ? content.match(matcher)?.[1]?.trim() : "";
    if (value) {
      parsed[definition.key] = value;
    }
  }

  return parsed;
};

export const getProtagonistMetadata = (node: OutlineNode): ProtagonistMetadata => {
  const legacy = node.kind === "protagonist" ? parseLegacyProtagonistMetadata(node.content) : {};
  const metadata = node.metadata ?? {};

  return protagonistFieldDefinitions.reduce<ProtagonistMetadata>((result, definition) => {
    const currentValue = textValue(metadata[definition.key]);
    result[definition.key] = currentValue || legacy[definition.key] || "";
    return result;
  }, {});
};

export const ensureProtagonistMetadata = (node: OutlineNode): OutlineNode => {
  if (node.kind !== "protagonist") return node;

  const parsed = getProtagonistMetadata(node);
  const metadata: OutlineNodeMetadata = {
    ...(node.metadata ?? {})
  };

  for (const definition of protagonistFieldDefinitions) {
    if (!textValue(metadata[definition.key]) && parsed[definition.key]) {
      metadata[definition.key] = parsed[definition.key];
    }
  }

  return {
    ...node,
    metadata
  };
};

export const getProtagonistFieldEntries = (metadata?: OutlineNodeMetadata) =>
  protagonistFieldDefinitions.map((definition) => ({
    ...definition,
    value: textValue(metadata?.[definition.key])
  }));
