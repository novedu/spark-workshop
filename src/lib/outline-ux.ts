import type { OutlineNode, OutlineNodeKind } from "@/types/product";

export type OutlineUxGroupId = "foundation" | "progressive" | "serialization" | "custom";

export type OutlineUxGroup = {
  id: OutlineUxGroupId;
  title: string;
  hint: string;
  nodeIds: string[];
};

export const outlineKindDisplayLabels: Record<OutlineNodeKind, string> = {
  world: "世界观",
  protagonist: "主角",
  antagonist: "压力源",
  goldenFinger: "金手指",
  conflict: "冲突",
  act: "篇章",
  arcPhase: "卷内阶段",
  foreshadowing: "伏笔"
};

export const outlineUxGroups: OutlineUxGroup[] = [
  {
    id: "foundation",
    title: "故事基底",
    hint: "先定读者视角、开局压力、世界规则和爽点发动机。",
    nodeIds: ["world", "protagonist", "antagonist", "golden-finger", "core-conflict"]
  },
  {
    id: "serialization",
    title: "连载推进",
    hint: "按卷、地图和小高潮链推进，不按出版物三幕收束。",
    nodeIds: ["act-1", "act-2", "act-3", "act-4", "act-5", "act-6", "act-7"]
  },
  {
    id: "progressive",
    title: "长线资产",
    hint: "伏笔、回收和终极压力源可以随连载逐步显影。",
    nodeIds: ["foreshadowing"]
  }
];

export const getOutlineNodeDisplayTitle = (node: OutlineNode) => {
  const titleById: Record<string, string> = {
    antagonist: "反派 / 压力源",
    "act-1": "开局卷：钩子与立局",
    "act-2": "新手升级卷：爽点循环",
    "act-3": "首个地图卷：副本与扩圈",
    "act-4": "势力扩张卷：资源争夺",
    "act-5": "中期转折卷：旧规则失效",
    "act-6": "高层地图卷：真相逼近",
    "act-7": "终局兑现卷：反击与收口"
  };

  return titleById[node.id] ?? node.title;
};

export const getOutlineNodeStageHint = (node: OutlineNode) => {
  if (node.kind === "arcPhase") {
    const role = node.metadata?.phaseRole;
    if (role === "setup") return "这一阶段负责立规矩、抛问题，不急着兑现大爽点。";
    if (role === "pressure") return "这一阶段负责持续加压，让主角必须付出代价。";
    if (role === "turning") return "这一阶段负责让旧办法失效或让金手指暴露边界。";
    if (role === "payoff") return "这一阶段负责集中兑现前面积累的压迫和期待。";
    if (role === "hook") return "这一阶段负责把胜利后的新问题抛给下一段。";
    return "这是卷内阶段节点，重点写清读者问题、压力源、兑现点和阶段钩子。";
  }

  const hintById: Record<string, string> = {
    antagonist: "可以先写阶段性压力，不必一开始确定终极反派。",
    foreshadowing: "先记录疑点和预计回收位置，后续随章节补充。",
    "act-1": "重点是第一章钩子、主角困境、金手指感知和开局关门。",
    "act-2": "重点是压制、准备、爆发、收获和新危机的循环。",
    "act-3": "重点是第一个新地图、新规则、新资源和阶段 boss。",
    "act-4": "重点是主角从个人破局进入组织、资源和势力争夺。",
    "act-5": "重点是旧打法失效，避免长篇中段只重复爽点。",
    "act-6": "重点是高层地图、世界真相和终极压力源逐步显形。",
    "act-7": "重点是长期伏笔、情绪债和最终反击集中兑现。"
  };

  return hintById[node.id] ?? "";
};

export const groupOutlineNodes = (nodes: OutlineNode[]) => {
  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
  const serializationNodes = sortedNodes.filter((node) => node.kind === "act" || node.kind === "arcPhase");
  const groupedNodeIds = new Set([
    ...outlineUxGroups.flatMap((group) => group.nodeIds),
    ...serializationNodes.map((node) => node.id)
  ]);
  const knownGroups = outlineUxGroups.map((group) => {
    if (group.id === "serialization") {
      return {
        ...group,
        nodeIds: serializationNodes.map((node) => node.id),
        nodes: serializationNodes
      };
    }

    return {
      ...group,
      nodes: group.nodeIds.map((id) => sortedNodes.find((node) => node.id === id)).filter(Boolean) as OutlineNode[]
    };
  });
  const customNodes = sortedNodes.filter((node) => !groupedNodeIds.has(node.id));

  if (customNodes.length === 0) return knownGroups;

  return [
    ...knownGroups,
    {
      id: "custom" as const,
      title: "补充节点",
      hint: "你手动增加的内容，按创作需要自由维护。",
      nodeIds: customNodes.map((node) => node.id),
      nodes: customNodes
    }
  ];
};
