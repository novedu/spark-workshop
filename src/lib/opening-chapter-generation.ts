import { ensureGoldenFingerMetadata, getGoldenFingerFieldEntries } from "@/lib/golden-finger-fields";
import { ensureOpeningChapterDrafts } from "@/lib/opening-chapter-drafts";
import { ensurePressureSourceMetadata, getPressureSourceFieldEntries } from "@/lib/pressure-source-fields";
import { ensureProtagonistMetadata, getProtagonistMetadata } from "@/lib/protagonist-fields";
import { ensureWorldState } from "@/lib/world-state";
import type {
  OpeningChapterDraftContextFact,
  OpeningChapterDraftGenerationContextSummary,
  OpeningChapterDraftGenerationInput,
  OpeningChapterDraftNumber,
  OpeningChapterGapFillInput,
  OpeningChapterGapId,
  OutlineNode,
  Project,
  WorldStateEvent,
  WorldStateForeshadowing,
  WorldStateRelation
} from "@/types/product";

type GenerationProjectInput = Pick<
  Project,
  "title" | "seedText" | "selectedScheme" | "outlineNodes" | "worldState" | "openingChapterPlan" | "openingChapterDrafts" | "updatedAt"
>;

const excerptLimit = 260;
const gapContextLimit = 1200;
export const openingChapterGapSelectionLimit = 1200;

const trimText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const pickOutlineNode = (nodes: OutlineNode[], kind: OutlineNode["kind"]) => nodes.find((node) => node.kind === kind);

const buildRelationLabel = (relation: WorldStateRelation) => {
  const label = trimText(relation.relationLabel);
  return label || `${relation.fromEntityId} -> ${relation.toEntityId}`;
};

const buildForeshadowingLabel = (foreshadowing: WorldStateForeshadowing) => foreshadowing.title || foreshadowing.id;

const buildEventLabel = (event: WorldStateEvent) => event.summary.slice(0, 24) || event.id;

const buildFactMaps = (project: GenerationProjectInput) => {
  const worldState = ensureWorldState(project, project.updatedAt);

  return {
    worldState,
    entityById: new Map(worldState.entities.map((entity) => [
      entity.id,
      {
        id: entity.id,
        kind: "entity" as const,
        label: entity.name || entity.id,
        summary: entity.summary,
        state: entity.currentState,
        status: entity.status
      }
    ])),
    relationById: new Map(worldState.relations.map((relation) => [
      relation.id,
      {
        id: relation.id,
        kind: "relation" as const,
        label: buildRelationLabel(relation),
        summary: relation.summary,
        status: relation.status
      }
    ])),
    foreshadowingById: new Map(worldState.foreshadowings.map((foreshadowing) => [
      foreshadowing.id,
      {
        id: foreshadowing.id,
        kind: "foreshadowing" as const,
        label: buildForeshadowingLabel(foreshadowing),
        summary: foreshadowing.summary,
        status: foreshadowing.status
      }
    ])),
    eventById: new Map(worldState.events.map((event) => [
      event.id,
      {
        id: event.id,
        kind: "event" as const,
        label: buildEventLabel(event),
        summary: event.summary,
        status: event.status
      }
    ]))
  };
};

const getRequiredFacts = (
  factMaps: ReturnType<typeof buildFactMaps>,
  factIds: string[],
  fallbackFacts: Map<string, OpeningChapterDraftContextFact>
) => {
  const { entityById, relationById, foreshadowingById, eventById } = factMaps;
  const facts: OpeningChapterDraftContextFact[] = [];

  for (const factId of factIds) {
    const fact = entityById.get(factId)
      ?? relationById.get(factId)
      ?? foreshadowingById.get(factId)
      ?? eventById.get(factId)
      ?? fallbackFacts.get(factId);
    if (fact) facts.push(fact);
  }

  return facts;
};

const getPreviousChapterContext = (project: GenerationProjectInput, chapterNumber: OpeningChapterDraftNumber) => {
  if (chapterNumber <= 1) return undefined;

  const drafts = ensureOpeningChapterDrafts({
    openingChapterPlan: project.openingChapterPlan,
    openingChapterDrafts: project.openingChapterDrafts,
    updatedAt: project.updatedAt
  }, project.updatedAt);
  const previousChapterNumber = (chapterNumber - 1) as OpeningChapterDraftNumber;
  const previousDraft = drafts.chapters.find((draft) => draft.chapterNumber === previousChapterNumber);
  const previousPlan = project.openingChapterPlan?.chapters.find((chapter) => chapter.chapterNumber === previousChapterNumber);
  const content = trimText(previousDraft?.content);
  if (!content) return undefined;

  const paragraphs = content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const tailParagraphs = paragraphs.slice(-2).join("\n");
  const endingExcerpt = tailParagraphs.length > excerptLimit
    ? tailParagraphs.slice(-excerptLimit)
    : tailParagraphs;

  return {
    chapterNumber: previousChapterNumber,
    title: previousDraft?.title || previousPlan?.title || `第 ${previousChapterNumber} 章`,
    endingExcerpt,
    continuityNote: previousPlan
      ? [previousPlan.stateChange, previousPlan.chapterHook].filter(Boolean).join("；")
      : undefined
  };
};

export const buildOpeningChapterDraftContextSummary = (
  input: Pick<OpeningChapterDraftGenerationInput, "requiredFacts" | "confirmedEvents" | "previousChapter" | "protagonistSummary" | "pressureSourceSummary" | "goldenFingerSummary">
): OpeningChapterDraftGenerationContextSummary => {
  const factIds = input.requiredFacts.map((fact) => fact.id);
  const fieldGroups = [
    input.protagonistSummary && Object.values(input.protagonistSummary).some(Boolean)
      ? "主角"
      : factIds.some((factId) => factId.startsWith("protagonist")) ? "主角" : "",
    input.pressureSourceSummary.some((entry) => trimText(entry.value))
      ? "压力源"
      : factIds.some((factId) => factId.startsWith("pressure-")) ? "压力源" : "",
    input.goldenFingerSummary.some((entry) => trimText(entry.value))
      ? "金手指"
      : factIds.some((factId) => factId.startsWith("golden-finger-")) ? "金手指" : ""
  ].filter((value): value is string => Boolean(value));

  return {
    factIds,
    confirmedEventIds: input.confirmedEvents.map((event) => event.id),
    previousChapterNumber: input.previousChapter?.chapterNumber,
    fieldGroups
  };
};

export const buildOpeningChapterDraftGenerationInput = (
  project: GenerationProjectInput,
  chapterNumber: OpeningChapterDraftNumber
): OpeningChapterDraftGenerationInput => {
  const outlineNodes = project.outlineNodes
    .map(ensureProtagonistMetadata)
    .map(ensurePressureSourceMetadata)
    .map(ensureGoldenFingerMetadata);
  const protagonistNode = pickOutlineNode(outlineNodes, "protagonist");
  const antagonistNode = pickOutlineNode(outlineNodes, "antagonist");
  const goldenFingerNode = pickOutlineNode(outlineNodes, "goldenFinger");
  const currentChapter = project.openingChapterPlan?.chapters.find((chapter) => chapter.chapterNumber === chapterNumber);

  if (!currentChapter) {
    throw new Error(`Opening chapter ${chapterNumber} plan is missing.`);
  }

  const protagonistSummary = protagonistNode ? getProtagonistMetadata(protagonistNode) : undefined;
  const pressureSourceSummary = getPressureSourceFieldEntries(antagonistNode?.metadata)
    .filter((entry) => trimText(entry.value))
    .map((entry) => ({
      label: entry.label,
      value: entry.value,
      stageValue: entry.stageValue || undefined
    }));
  const goldenFingerSummary = getGoldenFingerFieldEntries(goldenFingerNode?.metadata)
    .filter((entry) => trimText(entry.value))
    .map((entry) => ({
      label: entry.label,
      value: entry.value
    }));
  const fallbackFacts = new Map<string, OpeningChapterDraftContextFact>();
  const protagonistLines = protagonistSummary ? Object.values(protagonistSummary).filter((value) => trimText(value)).join("；") : "";
  const openingPressure = pressureSourceSummary.find((entry) => entry.label === "开局压力源")?.value
    || pressureSourceSummary[0]?.value
    || currentChapter.pressureOrPayoff;
  const goldenAbility = goldenFingerSummary.find((entry) => entry.label === "能力核心")?.value
    || goldenFingerSummary[0]?.value;
  const goldenLimitation = goldenFingerSummary.find((entry) => entry.label === "限制条件")?.value;
  const goldenCost = goldenFingerSummary.find((entry) => entry.label === "使用代价")?.value;
  const goldenUpgrade = goldenFingerSummary.find((entry) => entry.label === "升级方式")?.value;
  const pressureStageBoss = pressureSourceSummary.find((entry) => entry.label === "阶段 boss")?.value;
  const pressureEscalation = pressureSourceSummary.find((entry) => entry.label === "压力升级方式")?.value;

  if (protagonistLines) {
    fallbackFacts.set("protagonist-main", {
      id: "protagonist-main",
      kind: "entity",
      label: protagonistSummary?.identity || "主角",
      summary: protagonistLines,
      state: protagonistSummary?.openingPredicament
    });
  }
  if (openingPressure) {
    fallbackFacts.set("pressure-opening", {
      id: "pressure-opening",
      kind: "entity",
      label: "开局压力源",
      summary: openingPressure
    });
  }
  if (goldenAbility) {
    fallbackFacts.set("golden-finger-ability-core", {
      id: "golden-finger-ability-core",
      kind: "entity",
      label: "能力核心",
      summary: goldenAbility
    });
  }
  if (goldenLimitation) {
    fallbackFacts.set("golden-finger-limitation", {
      id: "golden-finger-limitation",
      kind: "entity",
      label: "限制条件",
      summary: goldenLimitation
    });
  }
  if (goldenCost) {
    fallbackFacts.set("golden-finger-cost", {
      id: "golden-finger-cost",
      kind: "entity",
      label: "使用代价",
      summary: goldenCost
    });
  }
  if (pressureStageBoss) {
    fallbackFacts.set("pressure-stage-boss", {
      id: "pressure-stage-boss",
      kind: "entity",
      label: "阶段 boss",
      summary: pressureStageBoss
    });
  }
  if (goldenUpgrade) {
    fallbackFacts.set("golden-finger-upgrade-path", {
      id: "golden-finger-upgrade-path",
      kind: "entity",
      label: "升级方式",
      summary: goldenUpgrade
    });
  }
  if (pressureEscalation) {
    fallbackFacts.set("pressure-escalation", {
      id: "pressure-escalation",
      kind: "entity",
      label: "压力升级方式",
      summary: pressureEscalation
    });
  }
  const factMaps = buildFactMaps({
    ...project,
    outlineNodes
  });

  return {
    projectTitle: trimText(project.title) || trimText(project.selectedScheme.title) || "未命名项目",
    seedText: trimText(project.seedText),
    chapterNumber,
    selectedScheme: {
      title: project.selectedScheme.title,
      tagline: project.selectedScheme.tagline,
      storyHook: project.selectedScheme.storyHook,
      premise: project.selectedScheme.premise,
      storyEngine: project.selectedScheme.storyEngine,
      coreConcept: project.selectedScheme.coreConcept,
      powerSystem: project.selectedScheme.powerSystem,
      conflictType: project.selectedScheme.conflictType
    },
    currentChapter,
    protagonistSummary,
    pressureSourceSummary,
    goldenFingerSummary,
    requiredFacts: getRequiredFacts(factMaps, currentChapter.requiredFactIds, fallbackFacts),
    confirmedEvents: factMaps.worldState.events
      .filter((event) => event.status === "confirmed")
      .slice(-6)
      .map((event) => ({
        id: event.id,
        summary: event.summary,
        relatedEntityIds: event.relatedEntityIds,
        chapterRange: event.source?.chapterRange
      })),
    previousChapter: getPreviousChapterContext(project, chapterNumber)
  };
};

export const buildOpeningChapterGapFillInput = (
  project: GenerationProjectInput,
  chapterNumber: OpeningChapterDraftNumber,
  gap: { id: OpeningChapterGapId; label: string; message: string },
  selectionStart: number,
  selectionEnd: number
): OpeningChapterGapFillInput => {
  const baseInput = buildOpeningChapterDraftGenerationInput(project, chapterNumber);
  const drafts = ensureOpeningChapterDrafts({
    openingChapterPlan: project.openingChapterPlan,
    openingChapterDrafts: project.openingChapterDrafts,
    updatedAt: project.updatedAt
  }, project.updatedAt);
  const draft = drafts.chapters.find((chapter) => chapter.chapterNumber === chapterNumber);
  if (!draft?.content.trim()) {
    throw new Error("AI 补写缺口需要当前章先有正文。");
  }

  const start = Math.max(0, Math.min(selectionStart, draft.content.length));
  const end = Math.max(start, Math.min(selectionEnd, draft.content.length));
  if (end - start > openingChapterGapSelectionLimit) {
    throw new Error(`单次最多替换 ${openingChapterGapSelectionLimit} 个字符，请缩小选区。`);
  }

  return {
    ...baseInput,
    gap,
    draftContext: {
      title: draft.title,
      beforeSelection: draft.content.slice(Math.max(0, start - gapContextLimit), start),
      selectedText: draft.content.slice(start, end),
      afterSelection: draft.content.slice(end, end + gapContextLimit)
    }
  };
};

export const applyOpeningChapterGapCandidate = (
  source: string,
  candidate: string,
  selectionStart: number,
  selectionEnd: number
) => {
  const start = Math.max(0, Math.min(selectionStart, source.length));
  const end = Math.max(start, Math.min(selectionEnd, source.length));
  const replacement = candidate.trim();
  if (!replacement) return source;

  const before = source.slice(0, start);
  const after = source.slice(end);
  if (start !== end) return `${before}${replacement}${after}`;

  const beforeSeparator = before && !before.endsWith("\n") ? "\n\n" : "";
  const afterSeparator = after && !after.startsWith("\n") ? "\n\n" : "";
  return `${before}${beforeSeparator}${replacement}${afterSeparator}${after}`;
};
