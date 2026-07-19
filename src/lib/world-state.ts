import type {
  ArcPhaseMetadata,
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

const syncPlannedStateEvents = (worldState: ProjectWorldState, outlineNodes: OutlineNode[]) => {
  const nextEvents = [...worldState.events];
  const eventIndexByNodeId = new Map(
    nextEvents
      .filter((event) => event.kind === "stateChange" && event.source?.nodeId)
      .map((event, index) => [event.source?.nodeId as string, index])
  );

  for (const event of createPlannedStateEvents(outlineNodes, worldState.updatedAt)) {
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
  project: Pick<Project, "outlineNodes" | "worldState" | "updatedAt">,
  timestamp = nowIso()
): ProjectWorldState => {
  const sourceState = normalizeWorldState(project.worldState, project.updatedAt || timestamp);
  const firstPhase = [...(project.outlineNodes ?? [])]
    .filter((node) => node.kind === "arcPhase")
    .sort((a, b) => a.order - b.order)[0];

  return {
    ...sourceState,
    currentArcPhaseId: sourceState.currentArcPhaseId || firstPhase?.id,
    events: syncPlannedStateEvents(sourceState, project.outlineNodes ?? []),
    updatedAt: sourceState.updatedAt || timestamp
  };
};

export const createWorldStateFromProject = (
  project: Pick<Project, "outlineNodes" | "worldState" | "updatedAt">,
  timestamp = nowIso()
) => ensureWorldState(project, timestamp);

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
