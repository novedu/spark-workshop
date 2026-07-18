import type { EmotionType, OutlineNode, OutlineNodeKind, ReaderEmotionGoal } from "@/types/product";

export const emotionGoalOptions: EmotionType[] = [
  "期待",
  "好奇",
  "心疼",
  "压迫",
  "紧张",
  "爽",
  "爽虐交织",
  "热血",
  "温馨",
  "悬疑",
  "虐"
];

export const defaultEmotionGoalByKind: Record<OutlineNodeKind, ReaderEmotionGoal> = {
  world: {
    emotion: "好奇",
    promise: "让读者想知道这个世界规则背后藏着什么代价。",
    intensity: 4
  },
  protagonist: {
    emotion: "心疼",
    promise: "让读者先站到主角这边，愿意看他翻身。",
    intensity: 4
  },
  antagonist: {
    emotion: "压迫",
    promise: "让读者感到压力源真能封住主角退路。",
    intensity: 4
  },
  goldenFinger: {
    emotion: "爽",
    promise: "让读者期待能力爆发，同时知道爽点背后有代价。",
    intensity: 5
  },
  conflict: {
    emotion: "紧张",
    promise: "让读者意识到主角每一步选择都会付出后果。",
    intensity: 4
  },
  act: {
    emotion: "期待",
    promise: "让这一阶段结束时读者想继续追下一段。",
    intensity: 4
  },
  foreshadowing: {
    emotion: "好奇",
    promise: "让读者记住疑点，并期待后文回收。",
    intensity: 3
  }
};

export const getNodeEmotionGoal = (node: OutlineNode): ReaderEmotionGoal =>
  node.emotionGoal ?? defaultEmotionGoalByKind[node.kind];
