import type { OutlineNode, TheoryId, V1TheoryId } from "@/types/product";
import { matchTheorySuggestions, runTheoryChecks } from "./theory-checker";

type TheoryEvalExpectation = {
  checkIncludes?: TheoryId[];
  checkExcludes?: TheoryId[];
  needsFixIncludes?: V1TheoryId[];
};

export type TheoryEvalSample = {
  id: string;
  title: string;
  oldReaderNote: string;
  creatorRisk: string;
  selectedNodeId: string | null;
  outlineNodes: OutlineNode[];
  expected: TheoryEvalExpectation;
};

export type TheoryEvalResult = {
  sampleId: string;
  passed: boolean;
  checkIds: TheoryId[];
  needsFixIds: V1TheoryId[];
  missingExpectedChecks: TheoryId[];
  unexpectedChecks: TheoryId[];
  missingExpectedNeedsFix: V1TheoryId[];
};

const node = (
  id: string,
  kind: OutlineNode["kind"],
  title: string,
  content: string,
  order: number,
  metadata?: OutlineNode["metadata"]
): OutlineNode => ({
  id,
  kind,
  title,
  content,
  order,
  ...(metadata ? { metadata } : {})
});

const completeOutline: OutlineNode[] = [
  node(
    "world",
    "world",
    "世界观设定",
    "三大势力按制度分配稀缺资源，普通职业只能拿污染名额；资源垄断导致黑市交易，主角的能力会打破阶层规则，引发利益争夺。",
    0
  ),
  node(
    "protagonist",
    "protagonist",
    "主角",
    "主角沈砚出身底层，开场困境是替人送死；底层欲望是不再被牺牲。他有不服输的善意软肋，成长弧线是从求生到主动承担代价。",
    1
  ),
  node(
    "antagonist",
    "antagonist",
    "反派",
    "反派目标是维护资源垄断，动机是相信秩序只能由强者安排；他掌握制度和情报，立场与主角的底层反抗形成镜像。",
    2
  ),
  node(
    "golden-finger",
    "goldenFinger",
    "金手指/力量体系",
    "力量来源是献祭失败后的残留能力；使用条件是主动交换记忆，限制是同一场战斗只能发动一次，代价会伤害主角的人际关系。",
    3
  ),
  node(
    "core-conflict",
    "conflict",
    "核心冲突",
    "主角目标是夺回人生选择权；现实阻碍是旧势力封锁资源和身份规则；失败代价是失去庇护者，并证明底层永远不能翻身。",
    4
  ),
  node(
    "act-1",
    "act",
    "第一幕：黄金开局",
    "开局用替死任务出场，第一章钩子是献祭失败；主角被迫选择暴露能力救人，第一幕关门是离开旧家族并被追杀。",
    5
  ),
  node(
    "act-2",
    "act",
    "第二幕：升级地图",
    "第二幕先让主角被压制吃亏，再准备布局和修炼；随后爆发反击打脸，获得资源奖励，但收获后引来更强敌人和新危机。",
    6
  ),
  node(
    "act-3",
    "act",
    "第三幕：绝地反击",
    "终局围绕资源规则总决战，主角用前期代价换来的盟友完成反击，结局收束到新秩序的建立。",
    7
  ),
  node(
    "foreshadowing",
    "foreshadowing",
    "伏笔与回收",
    "埋线：开局旧印记异常发热；回收：第一幕末尾揭晓与能力来源有关；后文第二幕引爆身份秘密，推动追杀升级。",
    8
  )
];

export const theoryEvalSamples: TheoryEvalSample[] = [
  {
    id: "missing-core-skeleton",
    title: "只有概念，没有骨架",
    oldReaderNote: "像只看到了设定名片，读者还不知道主角为什么非走不可。",
    creatorRisk: "容易继续堆设定，但故事发动机、代价和回收计划都没落地。",
    selectedNodeId: "core-conflict",
    outlineNodes: [
      node("world", "world", "世界观设定", "有一个神秘学院。", 0),
      node("protagonist", "protagonist", "主角", "", 1),
      node("antagonist", "antagonist", "反派", "", 2),
      node("golden-finger", "goldenFinger", "金手指/力量体系", "", 3),
      node("core-conflict", "conflict", "核心冲突", "", 4),
      node("act-1", "act", "第一幕：黄金开局", "", 5),
      node("act-2", "act", "第二幕：升级地图", "", 6),
      node("act-3", "act", "第三幕：绝地反击", "", 7),
      node("foreshadowing", "foreshadowing", "伏笔与回收", "", 8)
    ],
    expected: {
      checkIncludes: ["T01", "T02", "T03", "T04", "T07", "T11", "T13"],
      needsFixIncludes: ["T03"]
    }
  },
  {
    id: "complete-commercial-opening",
    title: "可试读的商业开局骨架",
    oldReaderNote: "主角、世界、冲突和爽点循环都有交代，暂时不该被硬拦。",
    creatorRisk: "后续主要看细节新鲜度，不应在 V1 基础规则里大量误报。",
    selectedNodeId: "protagonist",
    outlineNodes: completeOutline,
    expected: {
      checkExcludes: ["T01", "T02", "T03", "T04", "T07", "T11", "T12", "T13"]
    }
  },
  {
    id: "repeated-power-fantasy",
    title: "重复秒杀爽点",
    oldReaderNote: "一开始可能爽，但每次都秒杀会很快麻木。",
    creatorRisk: "金手指只有赢法，没有变化和边界，后续升级会失去期待感。",
    selectedNodeId: "golden-finger",
    outlineNodes: completeOutline.map((item) =>
      item.id === "golden-finger"
        ? {
            ...item,
            content: "力量来源是系统觉醒，限制是冷却一天，但主角每次都无敌秒杀、一直碾压，同样方式解决所有敌人。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T12"],
      needsFixIncludes: ["T12"]
    }
  },
  {
    id: "tool-antagonist",
    title: "工具人反派",
    oldReaderNote: "反派只坏不站得住，压迫感会像剧情工具。",
    creatorRisk: "反派没有目标或立场，后续冲突容易变成作者硬推。",
    selectedNodeId: "antagonist",
    outlineNodes: completeOutline.map((item) =>
      item.id === "antagonist"
        ? {
            ...item,
            content: "反派很坏，负责追杀主角，实力很强。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T13"],
      needsFixIncludes: ["T13"]
    }
  },
  {
    id: "weak-protagonist-empathy",
    title: "主角只有身份，没有共情入口",
    oldReaderNote: "知道主角是谁，但不知道为什么要替他急。",
    creatorRisk: "开局容易变成设定说明，缺少让读者站队的第一口情绪。",
    selectedNodeId: "protagonist",
    outlineNodes: completeOutline.map((item) =>
      item.id === "protagonist"
        ? {
            ...item,
            content: "主角林岫是外门弟子，擅长记账和推演阵法，未来会成为宗门新秩序的设计者。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T02"],
      needsFixIncludes: ["T02"]
    }
  },
  {
    id: "conflict-no-stakes",
    title: "有目标和阻碍，但没有失败代价",
    oldReaderNote: "主角想赢，对手也挡路，但输了好像也没什么。",
    creatorRisk: "冲突会变成任务清单，读者追读压力不够。",
    selectedNodeId: "core-conflict",
    outlineNodes: completeOutline.map((item) =>
      item.id === "core-conflict"
        ? {
            ...item,
            content: "主角目标是拿到外门试炼第一；现实阻碍是长老暗中限制名额，并安排同门竞争。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T03"],
      needsFixIncludes: ["T03"]
    }
  },
  {
    id: "foreshadowing-no-payoff",
    title: "只埋伏笔，没有回收计划",
    oldReaderNote: "前面挂了东西，但不知道作者后面会不会记得。",
    creatorRisk: "容易堆神秘感，后期忘线或强行解释。",
    selectedNodeId: "foreshadowing",
    outlineNodes: completeOutline.map((item) =>
      item.id === "foreshadowing"
        ? {
            ...item,
            content: "伏笔：主角腰间旧铜牌会在靠近禁地时发热，似乎藏着秘密和异常线索。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T04"],
      needsFixIncludes: ["T04"]
    }
  },
  {
    id: "power-without-boundary",
    title: "金手指只有能力，没有代价",
    oldReaderNote: "外挂能赢，但没看到为什么不能一直用。",
    creatorRisk: "越写越容易无成本横推，后续只能硬抬敌人。",
    selectedNodeId: "golden-finger",
    outlineNodes: completeOutline.map((item) =>
      item.id === "golden-finger"
        ? {
            ...item,
            content: "力量来源是祖传玉简觉醒，能力是复制别人刚用过的招式，并立刻反打。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T11"],
      needsFixIncludes: ["T11"]
    }
  },
  {
    id: "thin-serial-rhythm",
    title: "卷纲像出版大纲，缺连载爽点循环",
    oldReaderNote: "知道故事会发生什么，但不像一章追一章的网文。",
    creatorRisk: "卷纲太概括，缺少压制、爆发、奖励、新危机的持续链条。",
    selectedNodeId: "act-2",
    outlineNodes: completeOutline.map((item) =>
      item.kind === "act"
        ? {
            ...item,
            content: item.id === "act-1" ? "开局介绍主角和世界。" : "本卷继续调查旧案，并推进人物关系。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T01", "T07"],
      needsFixIncludes: ["T07"]
    }
  },
  {
    id: "thin-world-ecology",
    title: "世界观有名词，没有生态",
    oldReaderNote: "设定听着好看，但不知道资源怎么流、势力为什么争。",
    creatorRisk: "后续容易为了剧情临时发明门派、规则和职业。",
    selectedNodeId: "world",
    outlineNodes: completeOutline.map((item) =>
      item.id === "world"
        ? {
            ...item,
            content: "天空城漂浮在云海上，居民使用记忆灯照明，城市中心有一座古老高塔。"
          }
        : item
    ),
    expected: {
      checkIncludes: ["T13"],
      needsFixIncludes: ["T13"]
    }
  }
];

export const evaluateTheorySample = (sample: TheoryEvalSample): TheoryEvalResult => {
  const checkIds = runTheoryChecks({ outlineNodes: sample.outlineNodes }).map((result) => result.theoryId);
  const needsFixIds = matchTheorySuggestions(
    { outlineNodes: sample.outlineNodes },
    sample.selectedNodeId
  )
    .filter((match) => match.level === "needs_fix")
    .map((match) => match.theoryId);
  const expectedChecks = sample.expected.checkIncludes ?? [];
  const excludedChecks = sample.expected.checkExcludes ?? [];
  const expectedNeedsFix = sample.expected.needsFixIncludes ?? [];
  const missingExpectedChecks = expectedChecks.filter((theoryId) => !checkIds.includes(theoryId));
  const unexpectedChecks = excludedChecks.filter((theoryId) => checkIds.includes(theoryId));
  const missingExpectedNeedsFix = expectedNeedsFix.filter((theoryId) => !needsFixIds.includes(theoryId));

  return {
    sampleId: sample.id,
    passed:
      missingExpectedChecks.length === 0 &&
      unexpectedChecks.length === 0 &&
      missingExpectedNeedsFix.length === 0,
    checkIds,
    needsFixIds,
    missingExpectedChecks,
    unexpectedChecks,
    missingExpectedNeedsFix
  };
};

export const evaluateTheorySamples = () => theoryEvalSamples.map(evaluateTheorySample);
