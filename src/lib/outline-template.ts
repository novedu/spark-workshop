import type {
  ArcPhaseMetadata,
  ArcPhaseRole,
  OutlineNode,
  ReaderEmotionGoal,
  SerialArcMetadata,
  WorldScheme
} from "@/types/product";
import { defaultEmotionGoalByKind } from "./emotion-goals";

const nowIso = () => new Date().toISOString();

const serialArcTemplates = [
  {
    id: "act-1",
    title: "开局卷：钩子与立局",
    content: "设计黄金三章、主角困境、金手指首次感知、开局压力源和第一次必须追读的关门事件。",
    promise: "让读者在开局卷末尾想追下一段升级地图。",
    chapterRange: "1-30",
    volumeGoal: "立住主角困境、核心爽点和第一道不可回头的关门事件。",
    mapLayer: "出生地/旧秩序/新手场景。",
    pressureSource: "开局压迫主角的小反派、制度规则或资源垄断。",
    upgradeResource: "金手指首次感知、第一份资源、关键情报或救命机会。",
    miniClimax: "黄金三章内完成第一次反击或能力暴露。",
    nextVolumeHook: "主角被迫离开旧环境，进入第一轮升级地图。",
    emotion: "期待",
    intensity: 4
  },
  {
    id: "act-2",
    title: "新手升级卷：爽点循环",
    content: "设计压制、准备、爆发、收获和新危机的基础循环，让主角完成第一轮稳定变强。",
    promise: "让读者确认这本书的爽点发动机可以持续供章。",
    chapterRange: "31-120",
    volumeGoal: "跑通第一套爽点循环，让主角获得稳定升级路径。",
    mapLayer: "新手副本/宗门外门/城市底层圈子。",
    pressureSource: "同层竞争者、资源审核者或第一阶段 boss。",
    upgradeResource: "基础功法、系统任务、材料、人脉或身份通行证。",
    miniClimax: "主角用新规则完成第一次公开打脸或副本通关。",
    nextVolumeHook: "收获引来更高层注视，打开首个大地图。",
    emotion: "爽",
    intensity: 5
  },
  {
    id: "act-3",
    title: "首个地图卷：副本与扩圈",
    content: "设计第一个新地图/新圈层：新规则、新资源、新队友、新对手和阶段 boss。",
    promise: "用新地图和阶段 boss 证明故事不是只在开局设定里打转。",
    chapterRange: "121-250",
    volumeGoal: "进入首个大地图，扩展规则、队友、敌人和资源体系。",
    mapLayer: "第一个副本群/城市上层/宗门内门/异域入口。",
    pressureSource: "地图规则、阶段 boss、资源门槛和外部势力试探。",
    upgradeResource: "地图专属资源、队友能力、稀缺情报或新身份。",
    miniClimax: "阶段 boss 战或地图规则反转，证明主角能在新圈层站住。",
    nextVolumeHook: "胜利撬动更大的资源格局，势力冲突升级。",
    emotion: "爽虐交织",
    intensity: 5
  },
  {
    id: "act-4",
    title: "势力扩张卷：资源争夺",
    content: "设计组织、门派、公司、家族或城市级势力冲突，让主角从个人破局进入资源争夺。",
    promise: "让读者看到主角的胜利开始撬动更大的利益格局。",
    chapterRange: "251-450",
    volumeGoal: "让主角从个人升级进入组织/势力/资源争夺。",
    mapLayer: "门派、公司、家族、城市联盟或区域势力盘。",
    pressureSource: "资源垄断者、组织规则、旧势力联盟或利益集团。",
    upgradeResource: "地盘、渠道、名额、权柄、组织身份或核心资产。",
    miniClimax: "夺取关键资源点，打破旧势力的一次封锁。",
    nextVolumeHook: "旧打法开始触顶，更高层规则或代价浮出水面。",
    emotion: "压迫",
    intensity: 4
  },
  {
    id: "act-5",
    title: "中期转折卷：旧规则失效",
    content: "设计一次旧打法失效的大挫折：金手指代价升级、压力源换层、关键关系或身份暴露。",
    promise: "打破重复升级，让读者重新紧张主角是否还能赢。",
    chapterRange: "451-650",
    volumeGoal: "让旧打法失效，逼主角付出更大代价或换一套赢法。",
    mapLayer: "更高阶层/旧规则背后的审判场/失控副本。",
    pressureSource: "能力反噬、身份暴露、关系破裂或规则制定者下场。",
    upgradeResource: "新代价、新盟友、隐藏身份、规则漏洞或禁忌资源。",
    miniClimax: "主角在重大挫败后用新赢法完成反击。",
    nextVolumeHook: "反击揭开世界真相入口，终极压力源露出影子。",
    emotion: "紧张",
    intensity: 5
  },
  {
    id: "act-6",
    title: "高层地图卷：真相逼近",
    content: "设计更高层地图和世界真相：资源源头、规则制定者、终极压力源的影子逐步显形。",
    promise: "让前文伏笔开始连成网，同时保留更大的幕后疑问。",
    chapterRange: "651-850",
    volumeGoal: "逼近世界真相和资源源头，让前文伏笔连成网。",
    mapLayer: "高层地图/规则源头/幕后组织/世界边界。",
    pressureSource: "规则制定者、幕后黑手代理人、资源源头守门者。",
    upgradeResource: "真相碎片、终极资源线索、历史记忆或高层通行资格。",
    miniClimax: "揭开关键真相，但发现真相背后还有更大选择代价。",
    nextVolumeHook: "终极对手或终局选择正式摆到主角面前。",
    emotion: "悬疑",
    intensity: 4
  },
  {
    id: "act-7",
    title: "终局兑现卷：反击与收口",
    content: "设计最终阶段的连续兑现：能力代价、情感选择、伏笔回声、终极反击和番外/新书钩子。",
    promise: "让一千章前后累积的憋屈、爽点和伏笔集中兑现。",
    chapterRange: "851-1000+",
    volumeGoal: "集中兑现前文憋屈、能力代价、情感选择和长线伏笔。",
    mapLayer: "终局战场/规则核心/最终势力盘。",
    pressureSource: "终极对手、最终规则、不可两全的情感或世界代价。",
    upgradeResource: "全部伏笔回声、最终能力形态、盟友兑现和情感选择。",
    miniClimax: "连续反击、终极决战和核心规则改写。",
    nextVolumeHook: "收束主线，并保留番外、新时代或新书钩子。",
    emotion: "热血",
    intensity: 5
  }
] as const;

const createSerialArcMetadata = (template: (typeof serialArcTemplates)[number]): SerialArcMetadata => ({
  chapterRange: template.chapterRange,
  volumeGoal: template.volumeGoal,
  mapLayer: template.mapLayer,
  pressureSource: template.pressureSource,
  upgradeResource: template.upgradeResource,
  miniClimax: template.miniClimax,
  nextVolumeHook: template.nextVolumeHook
});

const serialArcMetadataById: Map<string, SerialArcMetadata> = new Map(
  serialArcTemplates.map((template) => [template.id, createSerialArcMetadata(template)])
);

type ArcPhaseTemplate = {
  id: string;
  parentId: string;
  title: string;
  content: string;
  phaseRole: ArcPhaseRole;
  chapterRange: string;
  readerQuestion: string;
  pressureSource: string;
  payoffBeat: string;
  chapterHook: string;
  stateChange: string;
  promise: string;
  emotion: ReaderEmotionGoal["emotion"];
  intensity: ReaderEmotionGoal["intensity"];
};

const arcPhaseTemplatesByActId: Record<string, ArcPhaseTemplate[]> = {
  "act-1": [
    {
      id: "act-1-phase-1",
      parentId: "act-1",
      title: "阶段 1：立局钩子",
      content: "第一章先抛出异常、压迫或选择，让读者马上知道主角为什么必须动起来。",
      phaseRole: "setup",
      chapterRange: "1-3",
      readerQuestion: "主角为什么非要打破当前处境？",
      pressureSource: "开局规则、家族/制度压迫或资源封锁。",
      payoffBeat: "让主角做出第一次不服从的小反击。",
      chapterHook: "主角的选择引来更直接的追打。",
      stateChange: "主角从被动承受变成主动破局。",
      promise: "让读者立刻关心主角能不能逃出第一道困境。",
      emotion: "好奇",
      intensity: 4
    },
    {
      id: "act-1-phase-2",
      parentId: "act-1",
      title: "阶段 2：压迫加码",
      content: "压力源第一次持续追打，证明开局困境不是一句设定，而是主角眼前的实际危险。",
      phaseRole: "pressure",
      chapterRange: "4-8",
      readerQuestion: "主角被逼到什么程度才会真正暴露底牌？",
      pressureSource: "小反派、稽查者、管事或掌握资源分配的人。",
      payoffBeat: "把前面憋屈压实，为第一次爆发蓄力。",
      chapterHook: "主角发现常规办法已经无路可走。",
      stateChange: "压力源正式锁定主角。",
      promise: "让读者憋着一口气等主角反击。",
      emotion: "压迫",
      intensity: 4
    },
    {
      id: "act-1-phase-3",
      parentId: "act-1",
      title: "阶段 3：金手指试用",
      content: "能力第一次有效，但同时暴露限制、代价或失控风险。",
      phaseRole: "turning",
      chapterRange: "9-14",
      readerQuestion: "这份能力到底能帮主角赢到哪一步，又会让他失去什么？",
      pressureSource: "能力代价、资源不足或更高层规则。",
      payoffBeat: "第一次用能力解决眼前难题。",
      chapterHook: "能力生效后引出新的代价或目击者。",
      stateChange: "金手指从概念变成可用但有边界的工具。",
      promise: "让读者既爽又担心代价。",
      emotion: "爽虐交织",
      intensity: 5
    },
    {
      id: "act-1-phase-4",
      parentId: "act-1",
      title: "阶段 4：小高潮兑现",
      content: "把前面积累的压迫兑现成第一次反击、打脸、通关或关系反转。",
      phaseRole: "payoff",
      chapterRange: "15-24",
      readerQuestion: "主角能不能把所有人以为不可能的事当众做成？",
      pressureSource: "围观者、公开规则或阶段小 boss。",
      payoffBeat: "第一次公开反击或破局，让围观者反应分层。",
      chapterHook: "胜利暴露主角价值，也暴露更高层利益链。",
      stateChange: "主角从可牺牲者变成必须被重视的人。",
      promise: "给读者第一轮明确爽感。",
      emotion: "爽",
      intensity: 5
    },
    {
      id: "act-1-phase-5",
      parentId: "act-1",
      title: "阶段 5：新地图关门",
      content: "旧环境回不去，主角被推入下一张地图或更高层压力源。",
      phaseRole: "hook",
      chapterRange: "25-30",
      readerQuestion: "主角赢了第一局以后，为什么麻烦反而更大？",
      pressureSource: "更高层势力、旧规则反扑或新地图门槛。",
      payoffBeat: "收获第一份资源、身份或关键线索。",
      chapterHook: "下一卷地图、敌人或资源源头露出。",
      stateChange: "主角正式离开开局舒适区。",
      promise: "让读者愿意追入下一卷。",
      emotion: "期待",
      intensity: 4
    }
  ],
  "act-2": [
    {
      id: "act-2-phase-1",
      parentId: "act-2",
      title: "阶段 1：新手地图立规矩",
      content: "交代新手地图、基础资源和同层竞争规则。",
      phaseRole: "setup",
      chapterRange: "31-45",
      readerQuestion: "主角进入新地图后，第一道规则是什么？",
      pressureSource: "同层竞争者和资源审核者。",
      payoffBeat: "主角找到第一条稳定升级路径。",
      chapterHook: "新地图的资源门槛露出。",
      stateChange: "主角获得进入新手地图的资格。",
      promise: "让读者确认故事能持续升级。",
      emotion: "期待",
      intensity: 4
    },
    {
      id: "act-2-phase-2",
      parentId: "act-2",
      title: "阶段 2：爽点循环跑通",
      content: "压制、准备、爆发、收获和新危机完整跑一轮。",
      phaseRole: "pressure",
      chapterRange: "46-90",
      readerQuestion: "主角能不能把新地图规则反过来为自己服务？",
      pressureSource: "阶段 boss、任务条件或资源垄断。",
      payoffBeat: "一次公开打脸、通关或资源反杀。",
      chapterHook: "收获引来更强对手注视。",
      stateChange: "主角从新手变成同层威胁。",
      promise: "让读者吃到第一套稳定爽点循环。",
      emotion: "爽",
      intensity: 5
    },
    {
      id: "act-2-phase-3",
      parentId: "act-2",
      title: "阶段 3：升级后遗症",
      content: "胜利带来新资源，也让更高层压力源开始行动。",
      phaseRole: "hook",
      chapterRange: "91-120",
      readerQuestion: "主角刚赢下新手局，为什么下一局更危险？",
      pressureSource: "更高层势力、资源债或能力代价。",
      payoffBeat: "主角拿到关键资源或身份通行证。",
      chapterHook: "首个大地图入口出现。",
      stateChange: "主角被更高层圈子记录在案。",
      promise: "把读者带向首个大地图。",
      emotion: "期待",
      intensity: 4
    }
  ]
};

const genericArcPhaseTemplates = (actId: string, chapterRange: string): ArcPhaseTemplate[] => [
  {
    id: `${actId}-phase-1`,
    parentId: actId,
    title: "阶段 1：新地图立规矩",
    content: "交代本卷地图、资源、规则和主角进入这层圈子的第一道门槛。",
    phaseRole: "setup",
    chapterRange,
    readerQuestion: "这一卷的新规则会怎样限制主角？",
    pressureSource: "地图规则、资源门槛或阶段压力源。",
    payoffBeat: "让主角找到进入本卷核心冲突的入口。",
    chapterHook: "阶段压力源正式出现。",
    stateChange: "主角进入本卷新圈层。",
    promise: "让读者理解本卷为什么不是重复上一卷。",
    emotion: "期待",
    intensity: 4
  },
  {
    id: `${actId}-phase-2`,
    parentId: actId,
    title: "阶段 2：压力与资源争夺",
    content: "让阶段压力源持续追打，主角为升级资源、身份、人脉或情报付出代价。",
    phaseRole: "pressure",
    chapterRange,
    readerQuestion: "主角要付出什么代价，才能突破本卷压力源？",
    pressureSource: "阶段 boss、制度阻力、资源垄断或关系破裂。",
    payoffBeat: "主角用新赢法完成一次反击。",
    chapterHook: "反击暴露更高层问题。",
    stateChange: "压力源从局部冲突升级为本卷核心冲突。",
    promise: "让读者看到主角的赢法在升级。",
    emotion: "紧张",
    intensity: 4
  },
  {
    id: `${actId}-phase-3`,
    parentId: actId,
    title: "阶段 3：小高潮与下一卷钩子",
    content: "集中兑现本卷关键爽点，再用更高层规则、新地图或新真相把读者拉走。",
    phaseRole: "hook",
    chapterRange,
    readerQuestion: "本卷赢了以后，下一层麻烦是什么？",
    pressureSource: "更高层敌人、能力代价或旧规则反扑。",
    payoffBeat: "本卷小高潮兑现：反杀、揭露、通关或资源夺取。",
    chapterHook: "下一卷地图、终极压力源或世界真相露出。",
    stateChange: "主角获得本卷阶段成果，同时欠下新代价。",
    promise: "让读者带着新问题进入下一卷。",
    emotion: "爽虐交织",
    intensity: 5
  }
];

const getArcPhaseTemplatesForAct = (actId: string): ArcPhaseTemplate[] => {
  const specificTemplates = arcPhaseTemplatesByActId[actId];
  if (specificTemplates) return specificTemplates;

  const actTemplate = serialArcTemplates.find((template) => template.id === actId);
  return genericArcPhaseTemplates(actId, actTemplate?.chapterRange ?? "");
};

const getAllArcPhaseTemplates = () => serialArcTemplates.flatMap((template) => getArcPhaseTemplatesForAct(template.id));

const createArcPhaseMetadata = (template: ArcPhaseTemplate): ArcPhaseMetadata => ({
  phaseRole: template.phaseRole,
  chapterRange: template.chapterRange,
  readerQuestion: template.readerQuestion,
  pressureSource: template.pressureSource,
  payoffBeat: template.payoffBeat,
  chapterHook: template.chapterHook,
  stateChange: template.stateChange
});

export const createArcPhaseNode = (parentId: string, order: number, phaseIndex = 1): OutlineNode => {
  const defaultTemplate = getArcPhaseTemplatesForAct(parentId)[phaseIndex - 1] ?? genericArcPhaseTemplates(parentId, "")[0];

  return {
    id: `${parentId}-phase-custom-${Date.now()}`,
    parentId,
    kind: "arcPhase",
    title: defaultTemplate.title,
    content: defaultTemplate.content,
    emotionGoal: {
      ...defaultEmotionGoalByKind.arcPhase,
      emotion: defaultTemplate.emotion,
      promise: defaultTemplate.promise,
      intensity: defaultTemplate.intensity
    },
    order,
    metadata: createArcPhaseMetadata(defaultTemplate)
  };
};

const createArcPhaseTemplateNode = (template: ArcPhaseTemplate, order: number): OutlineNode => ({
  id: template.id,
  parentId: template.parentId,
  kind: "arcPhase",
  title: template.title,
  content: template.content,
  emotionGoal: {
    ...defaultEmotionGoalByKind.arcPhase,
    emotion: template.emotion,
    promise: template.promise,
    intensity: template.intensity
  },
  order,
  metadata: createArcPhaseMetadata(template)
});

const normalizeOutlineOrder = (nodes: OutlineNode[]): OutlineNode[] => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const usedIds = new Set<string>();
  const orderedNodes: OutlineNode[] = [];
  const pushNode = (node: OutlineNode | undefined) => {
    if (!node || usedIds.has(node.id)) return;
    usedIds.add(node.id);
    orderedNodes.push(node);
  };

  ["world", "protagonist", "antagonist", "golden-finger", "core-conflict"].forEach((id) => {
    pushNode(nodesById.get(id));
  });

  for (const actTemplate of serialArcTemplates) {
    pushNode(nodesById.get(actTemplate.id));
    nodes
      .filter((node) => node.parentId === actTemplate.id)
      .sort((a, b) => a.order - b.order)
      .forEach(pushNode);
  }

  pushNode(nodesById.get("foreshadowing"));
  nodes
    .filter((node) => !usedIds.has(node.id))
    .sort((a, b) => a.order - b.order)
    .forEach(pushNode);

  return orderedNodes.map((node, index) => ({
    ...node,
    order: index
  }));
};

export const ensureSerialArcMetadata = (node: OutlineNode): OutlineNode => {
  if (node.kind !== "act") return node;

  const defaults = serialArcMetadataById.get(node.id);
  if (!defaults) return node;

  return {
    ...node,
    metadata: {
      ...defaults,
      ...(node.metadata ?? {})
    }
  };
};

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
  metadata: createSerialArcMetadata(template)
});

export const createOutlineFromScheme = (scheme: WorldScheme): OutlineNode[] => {
  const baseNodes: OutlineNode[] = [
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
    ...getAllArcPhaseTemplates().map((template, index) => createArcPhaseTemplateNode(template, index + 12)),
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

  return normalizeOutlineOrder(baseNodes);
};

export const ensureSerialArcNodes = (nodes: OutlineNode[]): OutlineNode[] => {
  if (nodes.length === 0) return nodes;

  const nodesWithMetadata = nodes.map(ensureSerialArcMetadata);
  const existingIds = new Set(nodesWithMetadata.map((node) => node.id));
  const missingArcNodes = serialArcTemplates
    .filter((template) => !existingIds.has(template.id))
    .map((template, index) => createSerialArcNode(template, nodes.length + index));
  const nodesWithActs = [...nodesWithMetadata, ...missingArcNodes].map(ensureSerialArcMetadata);
  const actPhaseTemplatesToAdd = serialArcTemplates.flatMap((actTemplate) => {
    const hasAnyPhaseForAct = nodesWithActs.some((node) => node.kind === "arcPhase" && node.parentId === actTemplate.id);
    if (hasAnyPhaseForAct) return [];
    return getArcPhaseTemplatesForAct(actTemplate.id);
  });
  const missingPhaseNodes = actPhaseTemplatesToAdd
    .filter((template) => !existingIds.has(template.id))
    .map((template, index) => createArcPhaseTemplateNode(template, nodesWithActs.length + index));

  if (missingArcNodes.length === 0 && missingPhaseNodes.length === 0) return normalizeOutlineOrder(nodesWithMetadata);

  return normalizeOutlineOrder([...nodesWithActs, ...missingPhaseNodes]);
};

export const createProjectId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `project-${nowIso()}`;
