import type {
  ArcPhaseMetadata,
  OpeningChapterPlan,
  OpeningChapterPlanChapter,
  OutlineNode,
  Project
} from "@/types/product";

const OPENING_CHAPTER_PLAN_VERSION = 1 as const;
const OPENING_CHAPTER_COUNT = 30;
const nowIso = () => new Date().toISOString();

const parseChapterRange = (value: unknown): [number, number] | null => {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+)\s*[-—~至到]\s*(\d+)/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return [Math.min(start, end), Math.max(start, end)];
};

const cleanTitle = (value: string) => value.replace(/^阶段\s*\d+\s*[：:]/, "").trim();

const getChapterFactIds = (chapterNumber: number) => {
  const ids = ["protagonist-main", "pressure-opening"];

  if (chapterNumber >= 3) {
    ids.push("golden-finger-ability-core");
  }

  if (chapterNumber >= 6) {
    ids.push("golden-finger-limitation", "golden-finger-cost");
  }

  if (chapterNumber >= 15) {
    ids.push("pressure-stage-boss");
  }

  if (chapterNumber >= 24) {
    ids.push("golden-finger-upgrade-path", "pressure-escalation");
  }

  return Array.from(new Set(ids));
};

const getOpeningAct = (nodes: OutlineNode[]) => nodes.find((node) => node.id === "act-1") ?? nodes.find((node) => node.kind === "act");

const getOpeningPhaseNodes = (nodes: OutlineNode[]) => {
  const openingAct = getOpeningAct(nodes);
  if (!openingAct) return [];

  return nodes
    .filter((node) => node.kind === "arcPhase" && node.parentId === openingAct.id)
    .sort((a, b) => a.order - b.order);
};

const findPhaseForChapter = (phaseNodes: OutlineNode[], chapterNumber: number) => {
  const matchedPhase = phaseNodes.find((node) => {
    const range = parseChapterRange(node.metadata?.chapterRange);
    return range ? chapterNumber >= range[0] && chapterNumber <= range[1] : false;
  });

  if (matchedPhase) return matchedPhase;
  if (phaseNodes.length === 0) return undefined;

  const phaseIndex = Math.min(
    phaseNodes.length - 1,
    Math.floor(((chapterNumber - 1) / OPENING_CHAPTER_COUNT) * phaseNodes.length)
  );
  return phaseNodes[phaseIndex];
};

const buildDefaultChapter = (
  chapterNumber: number,
  phaseNode: OutlineNode | undefined,
  openingAct: OutlineNode | undefined
): OpeningChapterPlanChapter => {
  const metadata = phaseNode?.metadata as ArcPhaseMetadata | undefined;
  const phaseTitle = phaseNode ? cleanTitle(phaseNode.title) : "开局推进";
  const readerQuestion = metadata?.readerQuestion?.trim() || "这一章让读者追问主角下一步能不能破局。";
  const pressureOrPayoff = metadata?.payoffBeat?.trim() || metadata?.pressureSource?.trim() || "用具体压力、反击或收获推动章节爽点。";
  const sceneTask = phaseNode?.content.trim() || openingAct?.content.trim() || "把主角目标、压力源和金手指边界落到一个可写场景。";
  const chapterHook = metadata?.chapterHook?.trim() || "章末留下下一章必须打开的新压力、新线索或新选择。";

  return {
    chapterNumber,
    title: `第${chapterNumber}章：${phaseTitle}`,
    arcPhaseId: phaseNode?.id,
    readerQuestion,
    sceneTask,
    pressureOrPayoff,
    chapterHook,
    requiredFactIds: getChapterFactIds(chapterNumber),
    stateChange: metadata?.stateChange?.trim() || "记录本章结束后主角、压力源或能力边界的变化。"
  };
};

const mergeChapter = (
  existing: OpeningChapterPlanChapter | undefined,
  fallback: OpeningChapterPlanChapter
): OpeningChapterPlanChapter => {
  if (!existing) return fallback;

  return {
    ...fallback,
    ...existing,
    chapterNumber: fallback.chapterNumber,
    title: existing.title?.trim() || fallback.title,
    readerQuestion: existing.readerQuestion?.trim() || fallback.readerQuestion,
    sceneTask: existing.sceneTask?.trim() || fallback.sceneTask,
    pressureOrPayoff: existing.pressureOrPayoff?.trim() || fallback.pressureOrPayoff,
    chapterHook: existing.chapterHook?.trim() || fallback.chapterHook,
    requiredFactIds: Array.isArray(existing.requiredFactIds) && existing.requiredFactIds.length > 0
      ? existing.requiredFactIds
      : fallback.requiredFactIds,
    stateChange: existing.stateChange?.trim() || fallback.stateChange,
    notes: existing.notes
  };
};

export const createOpeningChapterPlan = (
  outlineNodes: OutlineNode[],
  timestamp = nowIso()
): OpeningChapterPlan => {
  const openingAct = getOpeningAct(outlineNodes);
  const phaseNodes = getOpeningPhaseNodes(outlineNodes);
  const chapters = Array.from({ length: OPENING_CHAPTER_COUNT }, (_, index) => {
    const chapterNumber = index + 1;
    return buildDefaultChapter(chapterNumber, findPhaseForChapter(phaseNodes, chapterNumber), openingAct);
  });

  return {
    version: OPENING_CHAPTER_PLAN_VERSION,
    chapterRange: "1-30",
    sourceActId: openingAct?.id,
    chapters,
    updatedAt: timestamp
  };
};

export const ensureOpeningChapterPlan = (
  project: Pick<Project, "outlineNodes" | "openingChapterPlan" | "updatedAt">,
  timestamp = nowIso()
): OpeningChapterPlan => {
  const defaults = createOpeningChapterPlan(project.outlineNodes ?? [], timestamp);
  const existingChapters = new Map(
    (project.openingChapterPlan?.chapters ?? [])
      .filter((chapter) => chapter.chapterNumber >= 1 && chapter.chapterNumber <= OPENING_CHAPTER_COUNT)
      .map((chapter) => [chapter.chapterNumber, chapter])
  );

  return {
    ...defaults,
    ...(project.openingChapterPlan ?? {}),
    version: OPENING_CHAPTER_PLAN_VERSION,
    chapterRange: "1-30",
    sourceActId: project.openingChapterPlan?.sourceActId || defaults.sourceActId,
    chapters: defaults.chapters.map((chapter) => mergeChapter(existingChapters.get(chapter.chapterNumber), chapter)),
    updatedAt: project.openingChapterPlan?.updatedAt || project.updatedAt || timestamp
  };
};

export const getOpeningChapterPlanCounts = (plan: OpeningChapterPlan | undefined) => {
  const chapters = plan?.chapters ?? [];

  return {
    chapters: chapters.length,
    chaptersWithHooks: chapters.filter((chapter) => chapter.chapterHook.trim()).length,
    chaptersWithStateChange: chapters.filter((chapter) => chapter.stateChange.trim()).length,
    chaptersWithRequiredFacts: chapters.filter((chapter) => chapter.requiredFactIds.length > 0).length
  };
};
