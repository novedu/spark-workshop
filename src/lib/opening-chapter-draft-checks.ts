import { isOpeningChapterDraftStale } from "./opening-chapter-drafts";
import type {
  OpeningChapterDraft,
  OpeningChapterDraftSet,
  OpeningChapterPlan,
  OpeningChapterPlanChapter
} from "@/types/product";

export type OpeningChapterDraftCheckTone = "blocker" | "warning" | "pass";

export type OpeningChapterDraftCheck = {
  id: "length" | "paragraphs" | "hook" | "pressure" | "state-change" | "previous-chapter" | "required-facts" | "plan-sync";
  label: string;
  message: string;
  tone: OpeningChapterDraftCheckTone;
};

export type OpeningChapterDraftStats = {
  characterCount: number;
  paragraphCount: number;
  longestParagraphLength: number;
};

type CheckOpeningChapterDraftInput = {
  draft: OpeningChapterDraft;
  drafts: OpeningChapterDraftSet;
  plan?: OpeningChapterPlan;
  knownFactIds?: string[];
};

const HOOK_SIGNAL = /[?？]|(?:却|忽然|突然|竟然|原来|没想到|下一刻|就在这时|直到|只是|但是|可他|身后|门外|响起|出现|发现|看见|听见|传来|秘密|真相|名单|期限|倒计时|代价)/;
const PRESSURE_SIGNAL = /(?:却|但|逼|压|危机|威胁|代价|限时|失去|负伤|失败|绝境|反击|突破|赢|得到|奖励|打脸|逆转|解决|成功)/;
const GENERIC_PLAN_WORDS = new Set([
  "主角",
  "读者",
  "场景",
  "任务",
  "状态",
  "变化",
  "压力",
  "爽点",
  "冲突",
  "开始",
  "结束",
  "第一章",
  "第二章",
  "第三章"
]);

export const getOpeningChapterDraftStats = (content: string): OpeningChapterDraftStats => {
  const trimmed = content.trim();
  const paragraphs = trimmed
    ? trimmed.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];

  return {
    characterCount: trimmed.replace(/\s/g, "").length,
    paragraphCount: paragraphs.length,
    longestParagraphLength: paragraphs.reduce(
      (longest, paragraph) => Math.max(longest, paragraph.replace(/\s/g, "").length),
      0
    )
  };
};

const getPlanChapter = (plan: OpeningChapterPlan | undefined, chapterNumber: number) =>
  plan?.chapters.find((chapter) => chapter.chapterNumber === chapterNumber);

const extractPlanSignals = (text: string) => {
  const phrases = text
    .split(/[。！？，；：、,.!?;:\s]+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= 2 && !GENERIC_PLAN_WORDS.has(phrase));
  const signals = new Set<string>();

  for (const phrase of phrases) {
    if (phrase.length <= 6) {
      signals.add(phrase);
      continue;
    }

    for (let index = 0; index <= phrase.length - 3; index += 2) {
      const signal = phrase.slice(index, index + 4);
      if (signal.length >= 3 && !GENERIC_PLAN_WORDS.has(signal)) signals.add(signal);
    }
  }

  return [...signals].slice(0, 12);
};

const includesPlanSignal = (content: string, planText: string) =>
  extractPlanSignals(planText).some((signal) => content.includes(signal));

const checkLength = (stats: OpeningChapterDraftStats): OpeningChapterDraftCheck => {
  if (stats.characterCount === 0) {
    return { id: "length", label: "正文篇幅", message: "正文还是空的，先写下开场动作或冲突。", tone: "blocker" };
  }
  if (stats.characterCount < 800) {
    return { id: "length", label: "正文篇幅", message: `当前 ${stats.characterCount} 字，还像片段；首版建议至少写到 1800 字再连读。`, tone: "warning" };
  }
  if (stats.characterCount < 1800) {
    return { id: "length", label: "正文篇幅", message: `当前 ${stats.characterCount} 字，已成章，但低于 1800 字参考线。`, tone: "warning" };
  }
  if (stats.characterCount > 4500) {
    return { id: "length", label: "正文篇幅", message: `当前 ${stats.characterCount} 字，可检查是否能把一次转折拆到下一章。`, tone: "warning" };
  }
  return { id: "length", label: "正文篇幅", message: `当前 ${stats.characterCount} 字，处于首版参考区间。`, tone: "pass" };
};

const checkParagraphs = (stats: OpeningChapterDraftStats): OpeningChapterDraftCheck => {
  if (stats.characterCount === 0) {
    return { id: "paragraphs", label: "阅读密度", message: "有正文后再检查分段密度。", tone: "pass" };
  }
  if (stats.longestParagraphLength > 700 || (stats.characterCount > 800 && stats.paragraphCount < 3)) {
    return {
      id: "paragraphs",
      label: "阅读密度",
      message: `共 ${stats.paragraphCount} 段，最长段 ${stats.longestParagraphLength} 字；建议按动作、对话或转折拆段。`,
      tone: "warning"
    };
  }
  return { id: "paragraphs", label: "阅读密度", message: `共 ${stats.paragraphCount} 段，未发现明显超长段落。`, tone: "pass" };
};

const checkHook = (content: string): OpeningChapterDraftCheck => {
  if (!content.trim()) {
    return { id: "hook", label: "章末追读", message: "正文为空，暂无法检查章末追读信号。", tone: "pass" };
  }
  const ending = content.trim().slice(-240);
  if (!HOOK_SIGNAL.test(ending)) {
    return { id: "hook", label: "章末追读", message: "末段未命中问题、转折或新信息词，请人工确认是否有翻页点。", tone: "warning" };
  }
  return { id: "hook", label: "章末追读", message: "末段已命中问题、转折或新信息信号。", tone: "pass" };
};

const checkPressure = (content: string, planChapter: OpeningChapterPlanChapter | undefined): OpeningChapterDraftCheck => {
  if (!planChapter?.pressureOrPayoff.trim()) {
    return { id: "pressure", label: "爽点 / 压力", message: "当前章计划没有爽点或压力字段，先回节奏表补齐。", tone: "warning" };
  }
  if (!content.trim()) {
    return { id: "pressure", label: "爽点 / 压力", message: "计划已设定，等待正文承接。", tone: "pass" };
  }
  if (!PRESSURE_SIGNAL.test(content) && !includesPlanSignal(content, planChapter.pressureOrPayoff)) {
    return { id: "pressure", label: "爽点 / 压力", message: "正文未命中计划词或常见压力/兑现信号，请人工对照。", tone: "warning" };
  }
  return { id: "pressure", label: "爽点 / 压力", message: "正文已命中计划词或压力/兑现信号。", tone: "pass" };
};

const checkStateChange = (content: string, planChapter: OpeningChapterPlanChapter | undefined): OpeningChapterDraftCheck => {
  if (!planChapter?.stateChange.trim()) {
    return { id: "state-change", label: "章末状态变化", message: "当前章计划未填状态变化。", tone: "warning" };
  }
  if (!content.trim()) {
    return { id: "state-change", label: "章末状态变化", message: "计划已设定，等待正文承接。", tone: "pass" };
  }
  if (!includesPlanSignal(content, planChapter.stateChange)) {
    return { id: "state-change", label: "章末状态变化", message: "正文未命中状态变化中的特征词，请确认本章是否真正向前走了一步。", tone: "warning" };
  }
  return { id: "state-change", label: "章末状态变化", message: "正文已命中状态变化特征词。", tone: "pass" };
};

const checkPreviousChapter = (
  draft: OpeningChapterDraft,
  drafts: OpeningChapterDraftSet
): OpeningChapterDraftCheck => {
  if (draft.chapterNumber === 1) {
    return { id: "previous-chapter", label: "前章承接", message: "第 1 章无需承接前章。", tone: "pass" };
  }
  const previousDraft = drafts.chapters.find((chapter) => chapter.chapterNumber === draft.chapterNumber - 1);
  const previousStats = getOpeningChapterDraftStats(previousDraft?.content ?? "");
  if (previousStats.characterCount < 300) {
    return { id: "previous-chapter", label: "前章承接", message: `第 ${draft.chapterNumber - 1} 章还没有稳定草稿，建议先确认前章落点。`, tone: "warning" };
  }
  return { id: "previous-chapter", label: "前章承接", message: `第 ${draft.chapterNumber - 1} 章已有 ${previousStats.characterCount} 字可供承接。`, tone: "pass" };
};

const checkRequiredFacts = (
  planChapter: OpeningChapterPlanChapter | undefined,
  knownFactIds: string[]
): OpeningChapterDraftCheck => {
  const factIds = planChapter?.requiredFactIds ?? [];
  if (factIds.length === 0) {
    return { id: "required-facts", label: "依赖事实", message: "当前章未绑定世界事实，长篇一致性约束较弱。", tone: "warning" };
  }
  const knownIds = new Set(knownFactIds);
  const missingIds = factIds.filter((factId) => !knownIds.has(factId));
  if (missingIds.length > 0) {
    return { id: "required-facts", label: "依赖事实", message: `未找到 ${missingIds.join("、")}，请回计划或世界状态核对。`, tone: "warning" };
  }
  return { id: "required-facts", label: "依赖事实", message: `已找到 ${factIds.length} 个当前章依赖事实。`, tone: "pass" };
};

export const checkOpeningChapterDraft = ({
  draft,
  drafts,
  plan,
  knownFactIds = []
}: CheckOpeningChapterDraftInput): OpeningChapterDraftCheck[] => {
  const planChapter = getPlanChapter(plan, draft.chapterNumber);
  const stats = getOpeningChapterDraftStats(draft.content);
  const stale = isOpeningChapterDraftStale(draft, plan);

  return [
    checkLength(stats),
    checkParagraphs(stats),
    checkHook(draft.content),
    checkPressure(draft.content, planChapter),
    checkStateChange(draft.content, planChapter),
    checkPreviousChapter(draft, drafts),
    checkRequiredFacts(planChapter, knownFactIds),
    stale
      ? { id: "plan-sync", label: "计划同步", message: "正文基于旧版计划，内容不会自动覆盖；请对照新计划后手动确认。", tone: "warning" }
      : { id: "plan-sync", label: "计划同步", message: "正文对应当前章计划版本。", tone: "pass" }
  ];
};

export const getOpeningChapterDraftCheckCounts = (checks: OpeningChapterDraftCheck[]) => ({
  blockers: checks.filter((check) => check.tone === "blocker").length,
  warnings: checks.filter((check) => check.tone === "warning").length,
  passed: checks.filter((check) => check.tone === "pass").length
});
