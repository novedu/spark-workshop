import type { OutlineNode, WorldScheme } from "@/types/product";

const nowIso = () => new Date().toISOString();

export const createOutlineFromScheme = (scheme: WorldScheme): OutlineNode[] => [
  {
    id: "world",
    kind: "world",
    title: "世界观设定",
    content: scheme.coreConcept,
    order: 0
  },
  {
    id: "protagonist",
    kind: "protagonist",
    title: "主角",
    content: "补充主角姓名、底层欲望、开场困境和成长弧线。",
    order: 1
  },
  {
    id: "antagonist",
    kind: "antagonist",
    title: "反派",
    content: "补充反派目标、资源、压迫感和与主角的镜像关系。",
    order: 2
  },
  {
    id: "golden-finger",
    kind: "goldenFinger",
    title: "金手指/力量体系",
    content: scheme.powerSystem,
    order: 3
  },
  {
    id: "core-conflict",
    kind: "conflict",
    title: "核心冲突",
    content: scheme.conflictType,
    order: 4
  },
  {
    id: "act-1",
    kind: "act",
    title: "第一幕：黄金开局",
    content: "设计主角出场、救猫咪时刻、金手指觉醒和第一幕关门。",
    order: 5,
    metadata: { chapterRange: "1-30" }
  },
  {
    id: "act-2",
    kind: "act",
    title: "第二幕：升级地图",
    content: "设计升级地图、第一次重大挫折、中期转折和至暗时刻。",
    order: 6,
    metadata: { chapterRange: "31-200" }
  },
  {
    id: "act-3",
    kind: "act",
    title: "第三幕：绝地反击",
    content: "设计最终反击、最终决战和结局收束。",
    order: 7,
    metadata: { chapterRange: "201-300" }
  },
  {
    id: "foreshadowing",
    kind: "foreshadowing",
    title: "伏笔与回收",
    content: "记录已经埋下的设定、道具、人物秘密，以及预计回收节点。",
    order: 8
  }
];

export const createProjectId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `project-${nowIso()}`;
