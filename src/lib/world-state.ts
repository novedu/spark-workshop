import type {
  ArcPhaseMetadata,
  OpeningChapterPlan,
  OpeningChapterPlanChapter,
  IsoDateString,
  OutlineNode,
  Project,
  ProjectWorldState,
  WorldStateEntity,
  WorldStateEntityKind,
  WorldStateEntityStatus,
  WorldStateEvent,
  WorldStateEventKind,
  WorldStateEventStatus,
  WorldStateForeshadowing,
  WorldStateForeshadowingStatus,
  WorldStateRelation,
  WorldStateRelationStatus,
  WorldStateRelationType
} from "@/types/product";
import { getGoldenFingerFieldEntries } from "./golden-finger-fields";
import { getPressureSourceFieldEntries } from "./pressure-source-fields";
import { getProtagonistMetadata } from "./protagonist-fields";

const WORLD_STATE_VERSION = 1 as const;
const nowIso = () => new Date().toISOString();

const isMeaningfulText = (value: unknown) => {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text.length > 0 && !/^待补充|^记录已经埋下/.test(text);
};

const getSource = (node: OutlineNode) => ({
  nodeId: node.id,
  chapterRange: typeof node.metadata?.chapterRange === "string" ? node.metadata.chapterRange : undefined,
  label: node.title
});

const getPhaseStateChange = (node: OutlineNode) => {
  const metadata = node.metadata as ArcPhaseMetadata | undefined;
  return metadata?.stateChange?.trim() || "";
};

const getProtagonistEntity = (
  outlineNodes: OutlineNode[],
  existingEntities: WorldStateEntity[],
  timestamp: IsoDateString
) => {
  const protagonistNode = outlineNodes.find((node) => node.kind === "protagonist");
  if (!protagonistNode) return existingEntities;

  const profile = getProtagonistMetadata(protagonistNode);
  const profileValues = Object.values(profile).filter(Boolean);
  const content = protagonistNode.content.trim();
  const hasMeaningfulProfile = profileValues.length > 0 || (content.length > 0 && !/^补充主角/.test(content));
  if (!hasMeaningfulProfile) return existingEntities;

  const identity = profile.identity || "主角";
  const summary = [
    profile.coreDesire ? `底层欲望：${profile.coreDesire}` : "",
    profile.growthArc ? `成长弧线：${profile.growthArc}` : "",
    profile.keyRelationships ? `关键关系：${profile.keyRelationships}` : ""
  ]
    .filter(Boolean)
    .join("；") || content;
  const currentState = profile.openingPredicament || "开局状态待补充";
  const existing = existingEntities.find((entity) => entity.id === "protagonist-main");
  const nextEntity: WorldStateEntity = {
    id: "protagonist-main",
    kind: "character",
    name: identity,
    summary,
    currentState,
    status: "active",
    source: {
      nodeId: protagonistNode.id,
      label: "主角字段"
    },
    updatedAt: timestamp
  };

  if (!existing) return [...existingEntities, nextEntity];

  return existingEntities.map((entity) =>
    entity.id === "protagonist-main"
      ? {
          ...entity,
          ...nextEntity,
          aliases: entity.aliases
        }
      : entity
  );
};

const pressureEntityKindByKey: Record<string, WorldStateEntityKind> = {
  openingPressure: "other",
  stageBoss: "character",
  systemPressure: "faction",
  finalOpponent: "character",
  pressureEscalation: "rule"
};

const pressureEntityIdByKey: Record<string, string> = {
  openingPressure: "pressure-opening",
  stageBoss: "pressure-stage-boss",
  systemPressure: "pressure-system",
  finalOpponent: "pressure-final-opponent",
  pressureEscalation: "pressure-escalation"
};

const managedPressureEntityIds = new Set(Object.values(pressureEntityIdByKey));

const goldenFingerEntityIdByKey: Record<string, string> = {
  abilityCore: "golden-finger-ability-core",
  limitation: "golden-finger-limitation",
  cost: "golden-finger-cost",
  upgradePath: "golden-finger-upgrade-path",
  backlashRisk: "golden-finger-backlash-risk"
};

const goldenFingerEntityKindByKey: Record<string, WorldStateEntityKind> = {
  abilityCore: "ability",
  limitation: "rule",
  cost: "rule",
  upgradePath: "ability",
  backlashRisk: "rule"
};

const managedGoldenFingerEntityIds = new Set(Object.values(goldenFingerEntityIdByKey));

const trimEntityName = (text: string, fallback: string) => {
  const firstLine = text.split(/\n/)[0]?.trim() || fallback;
  const cleanLine = firstLine.replace(/[。；;，,].*$/, "").trim();
  return cleanLine.slice(0, 24) || fallback;
};

const getPressureSourceEntities = (
  outlineNodes: OutlineNode[],
  existingEntities: WorldStateEntity[],
  timestamp: IsoDateString
) => {
  const antagonistNode = outlineNodes.find((node) => node.kind === "antagonist");
  if (!antagonistNode) return existingEntities.filter((entity) => !managedPressureEntityIds.has(entity.id));

  const entries = getPressureSourceFieldEntries(antagonistNode.metadata).filter((entry) => entry.value);
  const activePressureEntityIds = new Set(entries.map((entry) => pressureEntityIdByKey[entry.key]).filter(Boolean));
  if (entries.length === 0) return existingEntities.filter((entity) => !managedPressureEntityIds.has(entity.id));

  const nextEntities = existingEntities.filter(
    (entity) => !managedPressureEntityIds.has(entity.id) || activePressureEntityIds.has(entity.id)
  );

  for (const entry of entries) {
    const id = pressureEntityIdByKey[entry.key];
    if (!id) continue;

    const existing = nextEntities.find((entity) => entity.id === id);
    const stageSummary = entry.stageValue ? `出场绑定：${entry.stageValue}` : "出场绑定待补充";
    const nextEntity: WorldStateEntity = {
      id,
      kind: pressureEntityKindByKey[entry.key] ?? "other",
      name: trimEntityName(entry.value, entry.label),
      summary: `${entry.label}：${entry.value}；${stageSummary}`,
      currentState: entry.stageValue || "待绑定出场卷或阶段",
      status: "active",
      source: {
        nodeId: antagonistNode.id,
        chapterRange: entry.stageValue || undefined,
        label: `压力源链 / ${entry.label}`
      },
      updatedAt: timestamp
    };

    if (!existing) {
      nextEntities.push(nextEntity);
      continue;
    }

    const existingIndex = nextEntities.findIndex((entity) => entity.id === id);
    nextEntities[existingIndex] = {
      ...existing,
      ...nextEntity,
      aliases: existing.aliases
    };
  }

  return nextEntities;
};

const getGoldenFingerEntities = (
  outlineNodes: OutlineNode[],
  existingEntities: WorldStateEntity[],
  timestamp: IsoDateString
) => {
  const goldenFingerNode = outlineNodes.find((node) => node.kind === "goldenFinger");
  if (!goldenFingerNode) return existingEntities.filter((entity) => !managedGoldenFingerEntityIds.has(entity.id));

  const entries = getGoldenFingerFieldEntries(goldenFingerNode.metadata).filter((entry) => entry.value);
  const activeGoldenFingerEntityIds = new Set(entries.map((entry) => goldenFingerEntityIdByKey[entry.key]).filter(Boolean));
  if (entries.length === 0) return existingEntities.filter((entity) => !managedGoldenFingerEntityIds.has(entity.id));

  const nextEntities = existingEntities.filter(
    (entity) => !managedGoldenFingerEntityIds.has(entity.id) || activeGoldenFingerEntityIds.has(entity.id)
  );

  for (const entry of entries) {
    const id = goldenFingerEntityIdByKey[entry.key];
    if (!id) continue;

    const existing = nextEntities.find((entity) => entity.id === id);
    const nextEntity: WorldStateEntity = {
      id,
      kind: goldenFingerEntityKindByKey[entry.key] ?? "ability",
      name: trimEntityName(entry.value, entry.label),
      summary: `${entry.label}：${entry.value}`,
      currentState: entry.value,
      status: "active",
      source: {
        nodeId: goldenFingerNode.id,
        label: `金手指基座 / ${entry.label}`
      },
      updatedAt: timestamp
    };

    if (!existing) {
      nextEntities.push(nextEntity);
      continue;
    }

    const existingIndex = nextEntities.findIndex((entity) => entity.id === id);
    nextEntities[existingIndex] = {
      ...existing,
      ...nextEntity,
      aliases: existing.aliases
    };
  }

  return nextEntities;
};

const createPlannedStateEvents = (outlineNodes: OutlineNode[], timestamp: IsoDateString): WorldStateEvent[] =>
  outlineNodes
    .filter((node) => node.kind === "arcPhase" && isMeaningfulText(getPhaseStateChange(node)))
    .map((node) => ({
      id: `outline-state-${node.id}`,
      kind: "stateChange" as const,
      status: "planned" as const,
      summary: getPhaseStateChange(node),
      source: getSource(node),
      createdAt: timestamp
    }));

const createOpeningChapterStateEvents = (
  openingChapterPlan: OpeningChapterPlan | undefined,
  timestamp: IsoDateString
): WorldStateEvent[] =>
  (openingChapterPlan?.chapters ?? [])
    .filter((chapter) => isMeaningfulText(chapter.stateChange))
    .map((chapter) => ({
      id: `opening-chapter-state-${chapter.chapterNumber}`,
      kind: "stateChange" as const,
      status: "planned" as const,
      summary: chapter.stateChange,
      relatedEntityIds: chapter.requiredFactIds,
      source: {
        nodeId: `opening-chapter-${chapter.chapterNumber}`,
        chapterRange: String(chapter.chapterNumber),
        label: `前 30 章 / 第 ${chapter.chapterNumber} 章`
      },
      createdAt: timestamp
    }));

export const getOpeningChapterStateEventId = (chapterNumber: number) => `opening-chapter-state-${chapterNumber}`;

const createOpeningChapterStateEvent = (
  chapter: OpeningChapterPlanChapter,
  timestamp: IsoDateString,
  status: WorldStateEventStatus = "planned"
): WorldStateEvent => ({
  id: getOpeningChapterStateEventId(chapter.chapterNumber),
  kind: "stateChange",
  status,
  summary: chapter.stateChange,
  relatedEntityIds: chapter.requiredFactIds,
  source: {
    nodeId: `opening-chapter-${chapter.chapterNumber}`,
    chapterRange: String(chapter.chapterNumber),
    label: `前 30 章 / 第 ${chapter.chapterNumber} 章`
  },
  createdAt: timestamp
});

export const createEmptyWorldState = (timestamp = nowIso()): ProjectWorldState => ({
  version: WORLD_STATE_VERSION,
  entities: [],
  relations: [],
  foreshadowings: [],
  events: [],
  updatedAt: timestamp
});

const normalizeWorldStateArray = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

export const normalizeWorldState = (
  worldState: Partial<ProjectWorldState> | undefined,
  timestamp = nowIso()
): ProjectWorldState => ({
  ...createEmptyWorldState(timestamp),
  ...(worldState ?? {}),
  version: WORLD_STATE_VERSION,
  entities: normalizeWorldStateArray(worldState?.entities),
  relations: normalizeWorldStateArray(worldState?.relations),
  foreshadowings: normalizeWorldStateArray(worldState?.foreshadowings),
  events: normalizeWorldStateArray(worldState?.events),
  updatedAt: worldState?.updatedAt || timestamp
});

const syncPlannedStateEvents = (
  worldState: ProjectWorldState,
  outlineNodes: OutlineNode[],
  openingChapterPlan?: OpeningChapterPlan
) => {
  const nextEvents = [...worldState.events];
  const eventIndexByNodeId = new Map(
    nextEvents
      .filter((event) => event.kind === "stateChange" && event.source?.nodeId)
      .map((event, index) => [event.source?.nodeId as string, index])
  );

  const plannedEvents = [
    ...createPlannedStateEvents(outlineNodes, worldState.updatedAt),
    ...createOpeningChapterStateEvents(openingChapterPlan, worldState.updatedAt)
  ];

  for (const event of plannedEvents) {
    const sourceNodeId = event.source?.nodeId;
    if (!sourceNodeId) continue;

    const existingIndex = eventIndexByNodeId.get(sourceNodeId);
    if (existingIndex === undefined) {
      eventIndexByNodeId.set(sourceNodeId, nextEvents.length);
      nextEvents.push(event);
      continue;
    }

    const existingEvent = nextEvents[existingIndex];
    if (existingEvent.status === "planned") {
      nextEvents[existingIndex] = {
        ...existingEvent,
        summary: event.summary,
        source: event.source
      };
    }
  }

  return nextEvents;
};

export const ensureWorldState = (
  project: Pick<Project, "outlineNodes" | "worldState" | "updatedAt"> & Pick<Partial<Project>, "openingChapterPlan">,
  timestamp = nowIso()
): ProjectWorldState => {
  const sourceState = normalizeWorldState(project.worldState, project.updatedAt || timestamp);
  const firstPhase = [...(project.outlineNodes ?? [])]
    .filter((node) => node.kind === "arcPhase")
    .sort((a, b) => a.order - b.order)[0];

  return {
    ...sourceState,
    currentArcPhaseId: sourceState.currentArcPhaseId || firstPhase?.id,
    entities: getGoldenFingerEntities(
      project.outlineNodes ?? [],
      getPressureSourceEntities(
        project.outlineNodes ?? [],
        getProtagonistEntity(project.outlineNodes ?? [], sourceState.entities, timestamp),
        timestamp
      ),
      timestamp
    ),
    events: syncPlannedStateEvents(sourceState, project.outlineNodes ?? [], project.openingChapterPlan),
    updatedAt: sourceState.updatedAt || timestamp
  };
};

export const createWorldStateFromProject = (
  project: Pick<Project, "outlineNodes" | "worldState" | "updatedAt">,
  timestamp = nowIso()
) => ensureWorldState(project, timestamp);

export const upsertOpeningChapterStateEvent = (
  worldState: ProjectWorldState | undefined,
  chapter: OpeningChapterPlanChapter,
  status: WorldStateEventStatus,
  timestamp = nowIso()
): ProjectWorldState => {
  const normalized = normalizeWorldState(worldState, timestamp);
  const nextEvent = createOpeningChapterStateEvent(chapter, timestamp, status);
  const existingIndex = normalized.events.findIndex(
    (event) =>
      event.id === nextEvent.id ||
      (event.kind === "stateChange" && event.source?.nodeId === nextEvent.source?.nodeId)
  );

  const events = [...normalized.events];
  if (existingIndex >= 0) {
    const existing = events[existingIndex];
    events[existingIndex] = {
      ...existing,
      ...nextEvent,
      status,
      createdAt: existing.createdAt || nextEvent.createdAt
    };
  } else {
    events.push(nextEvent);
  }

  return {
    ...normalized,
    events,
    updatedAt: timestamp
  };
};

export type WorldStateQuery = {
  entityIds?: string[];
  entityKinds?: WorldStateEntityKind[];
  entityStatuses?: WorldStateEntityStatus[];
  relationEntityId?: string;
  relationTypes?: WorldStateRelationType[];
  relationStatuses?: WorldStateRelationStatus[];
  foreshadowingStatus?: WorldStateForeshadowingStatus;
  eventEntityId?: string;
  eventKinds?: WorldStateEventKind[];
  eventStatuses?: WorldStateEventStatus[];
};

export type WorldStateQueryResult = {
  currentArcPhaseId?: string;
  entities: WorldStateEntity[];
  relations: WorldStateRelation[];
  foreshadowings: WorldStateForeshadowing[];
  events: WorldStateEvent[];
};

export const queryWorldState = (
  worldState: ProjectWorldState | undefined,
  query: WorldStateQuery = {}
): WorldStateQueryResult => {
  const normalized = normalizeWorldState(worldState);
  const entityIdSet = query.entityIds ? new Set(query.entityIds) : null;
  const entityKindSet = query.entityKinds ? new Set(query.entityKinds) : null;
  const entityStatusSet = query.entityStatuses ? new Set(query.entityStatuses) : null;
  const relationTypeSet = query.relationTypes ? new Set(query.relationTypes) : null;
  const relationStatusSet = query.relationStatuses ? new Set(query.relationStatuses) : null;
  const eventKindSet = query.eventKinds ? new Set(query.eventKinds) : null;
  const eventStatusSet = query.eventStatuses ? new Set(query.eventStatuses) : null;

  const entities = normalized.entities.filter((entity) => {
    if (entityIdSet && !entityIdSet.has(entity.id)) return false;
    if (entityKindSet && !entityKindSet.has(entity.kind)) return false;
    if (entityStatusSet && !entityStatusSet.has(entity.status)) return false;
    return true;
  });

  const relations = normalized.relations.filter((relation) => {
    if (query.relationEntityId && relation.fromEntityId !== query.relationEntityId && relation.toEntityId !== query.relationEntityId) {
      return false;
    }
    if (entityIdSet && !entityIdSet.has(relation.fromEntityId) && !entityIdSet.has(relation.toEntityId)) return false;
    if (relationTypeSet && !relationTypeSet.has(relation.relationType)) return false;
    if (relationStatusSet && !relationStatusSet.has(relation.status)) return false;
    return true;
  });

  const foreshadowings = normalized.foreshadowings.filter((foreshadowing) => {
    if (query.foreshadowingStatus && foreshadowing.status !== query.foreshadowingStatus) return false;
    if (
      entityIdSet &&
      !foreshadowing.relatedEntityIds?.some((entityId) => entityIdSet.has(entityId))
    ) {
      return false;
    }
    return true;
  });

  const events = normalized.events.filter((event) => {
    if (query.eventEntityId && event.entityId !== query.eventEntityId && !event.relatedEntityIds?.includes(query.eventEntityId)) {
      return false;
    }
    if (
      entityIdSet &&
      !event.entityId &&
      !event.relatedEntityIds?.some((entityId) => entityIdSet.has(entityId))
    ) {
      return false;
    }
    if (entityIdSet && event.entityId && !entityIdSet.has(event.entityId)) return false;
    if (eventKindSet && !eventKindSet.has(event.kind)) return false;
    if (eventStatusSet && !eventStatusSet.has(event.status)) return false;
    return true;
  });

  return {
    currentArcPhaseId: normalized.currentArcPhaseId,
    entities,
    relations,
    foreshadowings,
    events
  };
};

export const getWorldStateCounts = (worldState: ProjectWorldState | undefined) => {
  const normalized = normalizeWorldState(worldState);
  return {
    entities: normalized.entities.length,
    relations: normalized.relations.length,
    openForeshadowings: normalized.foreshadowings.filter((item) => item.status === "open").length,
    events: normalized.events.length
  };
};
