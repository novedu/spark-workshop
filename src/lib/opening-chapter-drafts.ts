import type {
  OpeningChapterDraft,
  OpeningChapterDraftNumber,
  OpeningChapterDraftSet,
  OpeningChapterPlan,
  OpeningChapterPlanChapter,
  Project
} from "@/types/product";

const OPENING_CHAPTER_DRAFT_SET_VERSION = 1 as const;
const DRAFT_CHAPTER_NUMBERS: OpeningChapterDraftNumber[] = [1, 2, 3];
const nowIso = () => new Date().toISOString();

const textValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const getOpeningChapterPlanSignature = (chapter: OpeningChapterPlanChapter | undefined) => {
  if (!chapter) return "";

  return [
    chapter.chapterNumber,
    chapter.title,
    chapter.arcPhaseId ?? "",
    chapter.readerQuestion,
    chapter.sceneTask,
    chapter.pressureOrPayoff,
    chapter.chapterHook,
    chapter.requiredFactIds.join(","),
    chapter.stateChange
  ].join("|");
};

const getFallbackTitle = (chapterNumber: OpeningChapterDraftNumber, planChapter?: OpeningChapterPlanChapter) =>
  textValue(planChapter?.title) || `第${chapterNumber}章：待试写`;

const createDefaultDraft = (
  chapterNumber: OpeningChapterDraftNumber,
  planChapter: OpeningChapterPlanChapter | undefined,
  timestamp: string
): OpeningChapterDraft => ({
  chapterNumber,
  title: getFallbackTitle(chapterNumber, planChapter),
  content: "",
  status: "empty",
  origin: "author",
  sourcePlanSignature: getOpeningChapterPlanSignature(planChapter),
  usedFactIds: planChapter?.requiredFactIds ?? [],
  stateChangeStatus: "pending",
  createdAt: timestamp,
  updatedAt: timestamp
});

const normalizeDraft = (
  existing: OpeningChapterDraft | undefined,
  fallback: OpeningChapterDraft
): OpeningChapterDraft => {
  if (!existing) return fallback;

  const content = typeof existing.content === "string" ? existing.content : "";
  const status = content.trim().length > 0
    ? existing.status === "confirmed"
      ? "confirmed"
      : "draft"
    : "empty";

  return {
    ...fallback,
    ...existing,
    chapterNumber: fallback.chapterNumber,
    title: textValue(existing.title) || fallback.title,
    content,
    status,
    origin: existing.origin ?? fallback.origin,
    sourcePlanSignature: status === "empty"
      ? fallback.sourcePlanSignature
      : existing.sourcePlanSignature || fallback.sourcePlanSignature,
    usedFactIds: status === "empty"
      ? fallback.usedFactIds
      : Array.isArray(existing.usedFactIds) && existing.usedFactIds.length > 0
      ? existing.usedFactIds
      : fallback.usedFactIds,
    stateChangeStatus: existing.stateChangeStatus ?? fallback.stateChangeStatus,
    createdAt: existing.createdAt || fallback.createdAt,
    updatedAt: existing.updatedAt || fallback.updatedAt
  };
};

export const createOpeningChapterDrafts = (
  openingChapterPlan: OpeningChapterPlan | undefined,
  timestamp = nowIso()
): OpeningChapterDraftSet => {
  const chapters = DRAFT_CHAPTER_NUMBERS.map((chapterNumber) =>
    createDefaultDraft(
      chapterNumber,
      openingChapterPlan?.chapters.find((chapter) => chapter.chapterNumber === chapterNumber),
      timestamp
    )
  );

  return {
    version: OPENING_CHAPTER_DRAFT_SET_VERSION,
    chapterRange: "1-3",
    chapters,
    updatedAt: timestamp
  };
};

export const ensureOpeningChapterDrafts = (
  project: Pick<Project, "openingChapterPlan" | "openingChapterDrafts" | "updatedAt">,
  timestamp = nowIso()
): OpeningChapterDraftSet => {
  const defaults = createOpeningChapterDrafts(project.openingChapterPlan, timestamp);
  const existingChapters = new Map(
    (project.openingChapterDrafts?.chapters ?? [])
      .filter((chapter) => DRAFT_CHAPTER_NUMBERS.includes(chapter.chapterNumber))
      .map((chapter) => [chapter.chapterNumber, chapter])
  );

  return {
    version: OPENING_CHAPTER_DRAFT_SET_VERSION,
    chapterRange: "1-3",
    chapters: defaults.chapters.map((chapter) => normalizeDraft(existingChapters.get(chapter.chapterNumber), chapter)),
    updatedAt: project.openingChapterDrafts?.updatedAt || project.updatedAt || timestamp
  };
};

export const getOpeningChapterDraftCounts = (drafts: OpeningChapterDraftSet | undefined) => {
  const chapters = drafts?.chapters ?? [];

  return {
    chapters: chapters.length,
    empty: chapters.filter((chapter) => chapter.status === "empty").length,
    draft: chapters.filter((chapter) => chapter.status === "draft").length,
    confirmed: chapters.filter((chapter) => chapter.status === "confirmed").length
  };
};

export const isOpeningChapterDraftStale = (
  draft: OpeningChapterDraft,
  openingChapterPlan: OpeningChapterPlan | undefined
) => {
  const planChapter = openingChapterPlan?.chapters.find((chapter) => chapter.chapterNumber === draft.chapterNumber);
  const currentSignature = getOpeningChapterPlanSignature(planChapter);
  return Boolean(draft.sourcePlanSignature && currentSignature && draft.sourcePlanSignature !== currentSignature);
};
