import type { OutlineNode, WorldScheme } from "@/types/product";
import { defaultEmotionGoalByKind } from "./emotion-goals";

const nowIso = () => new Date().toISOString();

const serialArcTemplates = [
  {
    id: "act-1",
    title: "开局卷：钩子与立局",
    content: "设计黄金三章、主角困境、金手指首次感知、开局压力源和第一次必须追读的关门事件。",
    promise: "让读者在开局卷末尾想追下一段升级地图。",
    chapterRange: "1-30",
    emotion: "期待",
    intensity: 4
  },
  {
    id: "act-2",
    title: "新手升级卷：爽点循环",
    content: "设计压制、准备、爆发、收获和新危机的基础循环，让主角完成第一轮稳定变强。",
    promise: "让读者确认这本书的爽点发动机可以持续供章。",
    chapterRange: "31-120",
    emotion: "爽",
    intensity: 5
  },
  {
    id: "act-3",
    title: "首个地图卷：副本与扩圈",
    content: "设计第一个新地图/新圈层：新规则、新资源、新队友、新对手和阶段 boss。",
    promise: "用新地图和阶段 boss 证明故事不是只在开局设定里打转。",
    chapterRange: "121-250",
    emotion: "爽虐交织",
    intensity: 5
  },
  {
    id: "act-4",
    title: "势力扩张卷：资源争夺",
    content: "设计组织、门派、公司、家族或城市级势力冲突，让主角从个人破局进入资源争夺。",
    promise: "让读者看到主角的胜利开始撬动更大的利益格局。",
    chapterRange: "251-450",
    emotion: "压迫",
    intensity: 4
  },
  {
    id: "act-5",
    title: "中期转折卷：旧规则失效",
    content: "设计一次旧打法失效的大挫折：金手指代价升级、压力源换层、关键关系或身份暴露。",
    promise: "打破重复升级，让读者重新紧张主角是否还能赢。",
    chapterRange: "451-650",
    emotion: "紧张",
    intensity: 5
  },
  {
    id: "act-6",
    title: "高层地图卷：真相逼近",
    content: "设计更高层地图和世界真相：资源源头、规则制定者、终极压力源的影子逐步显形。",
    promise: "让前文伏笔开始连成网，同时保留更大的幕后疑问。",
    chapterRange: "651-850",
    emotion: "悬疑",
    intensity: 4
  },
  {
    id: "act-7",
    title: "终局兑现卷：反击与收口",
    content: "设计最终阶段的连续兑现：能力代价、情感选择、伏笔回声、终极反击和番外/新书钩子。",
    promise: "让一千章前后累积的憋屈、爽点和伏笔集中兑现。",
    chapterRange: "851-1000+",
    emotion: "热血",
    intensity: 5
  }
] as const;

const createSerialArcNode = (
  template: (typeof serialArcTemplates)[number],
  order: number
): OutlineNode => ({
  id: template.id,
  kind: "act",
  title: template.title,
  content: template.content,
  emotionGoal: {
    ...defaultEmotionGoalByKind.act,
    emotion: template.emotion,
    promise: template.promise,
    intensity: template.intensity
  },
  order,
  metadata: { chapterRange: template.chapterRange }
});

export const createOutlineFromScheme = (scheme: WorldScheme): OutlineNode[] => [
  {
    id: "world",
    kind: "world",
    title: "世界观设定",
    content: [
      scheme.storyHook ? `开篇钩子：${scheme.storyHook}` : "",
      scheme.premise ? `故事前提：${scheme.premise}` : "",
      scheme.storyEngine ? `故事引擎：${scheme.storyEngine}` : "",
      scheme.coreConcept
    ].filter(Boolean).join("\n"),
    emotionGoal: defaultEmotionGoalByKind.world,
    order: 0
  },
  {
    id: "protagonist",
    kind: "protagonist",
    title: "主角",
    content: "补充主角姓名、底层欲望、开场困境和成长弧线。",
    emotionGoal: defaultEmotionGoalByKind.protagonist,
    order: 1
  },
  {
    id: "antagonist",
    kind: "antagonist",
    title: "反派 / 压力源",
    content: "先写开局阶段压住主角的压力来源：可以是小反派、势力规则、资源垄断、家族/宗门/资本压力，也可以后续再升级为真正反派。",
    emotionGoal: defaultEmotionGoalByKind.antagonist,
    order: 2
  },
  {
    id: "golden-finger",
    kind: "goldenFinger",
    title: "金手指/力量体系",
    content: scheme.powerSystem,
    emotionGoal: defaultEmotionGoalByKind.goldenFinger,
    order: 3
  },
  {
    id: "core-conflict",
    kind: "conflict",
    title: "核心冲突",
    content: scheme.conflictType,
    emotionGoal: defaultEmotionGoalByKind.conflict,
    order: 4
  },
  ...serialArcTemplates.map((template, index) => createSerialArcNode(template, index + 5)),
  {
    id: "foreshadowing",
    kind: "foreshadowing",
    title: "伏笔与回收",
    content: "记录已经埋下的设定、道具、人物秘密，以及预计回收节点。",
    emotionGoal: {
      ...defaultEmotionGoalByKind.foreshadowing,
      promise: "让读者记住疑点，并期待后文揭晓时的回声。"
    },
    order: 12
  }
];

export const ensureSerialArcNodes = (nodes: OutlineNode[]): OutlineNode[] => {
  if (nodes.length === 0) return nodes;

  const existingIds = new Set(nodes.map((node) => node.id));
  const missingArcNodes = serialArcTemplates
    .filter((template) => !existingIds.has(template.id))
    .map((template, index) => createSerialArcNode(template, nodes.length + index));

  if (missingArcNodes.length === 0) return nodes;

  const nextNodes = [...nodes, ...missingArcNodes];
  return nextNodes.map((node, index) => ({
    ...node,
    order: index
  }));
};

export const createProjectId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `project-${nowIso()}`;
