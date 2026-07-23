"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  FilePenLine,
  RefreshCw,
  Save,
  WandSparkles,
  X
} from "lucide-react";
import {
  checkOpeningChapterDraft,
  getOpeningChapterDraftCheckCounts,
  getOpeningChapterDraftStats
} from "@/lib/opening-chapter-draft-checks";
import {
  getOpeningChapterPlanSignature,
  getOpeningChapterDraftCounts,
  isOpeningChapterDraftStale
} from "@/lib/opening-chapter-drafts";
import type {
  LlmResultMeta,
  OpeningChapterDraft,
  OpeningChapterDraftGenerationContextSummary,
  OpeningChapterDraftNumber,
  OpeningChapterDraftSet,
  OpeningChapterGapId,
  OpeningChapterPlan
} from "@/types/product";

export type OpeningDraftSaveState = "idle" | "pending" | "saving" | "saved" | "error";

export type OpeningGapFillRequest = {
  chapterNumber: OpeningChapterDraftNumber;
  gapId: OpeningChapterGapId;
  gapLabel: string;
  gapMessage: string;
  selectionStart: number;
  selectionEnd: number;
};

export type OpeningGapFillFeedback = {
  chapterNumber: OpeningChapterDraftNumber;
  gapId: OpeningChapterGapId;
  gapLabel: string;
  tone: "pending" | "success" | "applied" | "error";
  message: string;
  content?: string;
  selectionStart: number;
  selectionEnd: number;
  sourceDraftUpdatedAt: string;
  sourcePlanSignature: string;
  usedFactIds?: string[];
  meta?: LlmResultMeta | null;
};

interface OpeningChapterDraftEditorProps {
  drafts: OpeningChapterDraftSet;
  plan: OpeningChapterPlan;
  knownFactIds: string[];
  saveState?: OpeningDraftSaveState;
  generatingChapterNumber?: OpeningChapterDraftNumber | null;
  confirmingChapterNumber?: OpeningChapterDraftNumber | null;
  generationFeedback?: {
    chapterNumber: OpeningChapterDraftNumber;
    tone: "pending" | "success" | "error";
    message: string;
    meta?: LlmResultMeta | null;
    contextSummary?: OpeningChapterDraftGenerationContextSummary;
  } | null;
  confirmationFeedback?: {
    chapterNumber: OpeningChapterDraftNumber;
    tone: "success" | "error";
    message: string;
  } | null;
  gapFilling?: { chapterNumber: OpeningChapterDraftNumber; gapId: OpeningChapterGapId } | null;
  gapFillFeedback?: OpeningGapFillFeedback | null;
  onChange: (drafts: OpeningChapterDraftSet) => void;
  onGenerate?: (chapterNumber: OpeningChapterDraftNumber) => void;
  onConfirm?: (chapterNumber: OpeningChapterDraftNumber) => void;
  onFillGap?: (request: OpeningGapFillRequest) => void;
  onApplyGapFill?: (input: OpeningGapFillFeedback & { content: string }) => void;
  onDismissGapFill?: () => void;
}

const saveStateCopy: Record<OpeningDraftSaveState, string> = {
  idle: "本地草稿已就绪",
  pending: "等待自动保存",
  saving: "正在保存",
  saved: "已自动保存",
  error: "自动保存失败"
};

const draftStatusCopy: Record<OpeningChapterDraft["status"], string> = {
  empty: "待试写",
  draft: "草稿",
  confirmed: "已确认"
};

const aiFillableCheckIds = new Set<OpeningChapterGapId>(["length", "hook", "pressure", "state-change"]);

const updateDraftSet = (
  drafts: OpeningChapterDraftSet,
  chapterNumber: OpeningChapterDraftNumber,
  updates: Partial<OpeningChapterDraft>
): OpeningChapterDraftSet => {
  const timestamp = new Date().toISOString();

  return {
    ...drafts,
    chapters: drafts.chapters.map((chapter) =>
      chapter.chapterNumber === chapterNumber
        ? {
            ...chapter,
            ...updates,
            updatedAt: timestamp
          }
        : chapter
    ),
    updatedAt: timestamp
  };
};

export function OpeningChapterDraftEditor({
  drafts,
  plan,
  knownFactIds,
  saveState = "idle",
  generatingChapterNumber = null,
  confirmingChapterNumber = null,
  generationFeedback = null,
  confirmationFeedback = null,
  gapFilling = null,
  gapFillFeedback = null,
  onChange,
  onGenerate,
  onConfirm,
  onFillGap,
  onApplyGapFill,
  onDismissGapFill
}: OpeningChapterDraftEditorProps) {
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<OpeningChapterDraftNumber>(1);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionTouchedRef = useRef(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [gapFillContent, setGapFillContent] = useState("");
  const sortedDrafts = useMemo(
    () => [...drafts.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [drafts.chapters]
  );
  const selectedDraft = sortedDrafts.find((draft) => draft.chapterNumber === selectedChapterNumber) ?? sortedDrafts[0];
  const selectedPlanChapter = plan.chapters.find((chapter) => chapter.chapterNumber === selectedDraft?.chapterNumber);
  const checks = useMemo(
    () => selectedDraft
      ? checkOpeningChapterDraft({ draft: selectedDraft, drafts, plan, knownFactIds })
      : [],
    [drafts, knownFactIds, plan, selectedDraft]
  );
  const checkCounts = getOpeningChapterDraftCheckCounts(checks);
  const draftCounts = getOpeningChapterDraftCounts(drafts);
  const selectedStats = getOpeningChapterDraftStats(selectedDraft?.content ?? "");
  const stale = selectedDraft ? isOpeningChapterDraftStale(selectedDraft, plan) : false;
  const isGeneratingCurrentChapter = generatingChapterNumber === selectedDraft.chapterNumber;
  const isConfirmingCurrentChapter = confirmingChapterNumber === selectedDraft.chapterNumber;
  const isDraftOperationBusy = generatingChapterNumber !== null
    || confirmingChapterNumber !== null
    || gapFilling !== null;
  const currentGenerationFeedback = generationFeedback?.chapterNumber === selectedDraft.chapterNumber
    ? generationFeedback
    : null;
  const currentConfirmationFeedback = confirmationFeedback?.chapterNumber === selectedDraft.chapterNumber
    ? confirmationFeedback
    : null;
  const currentGapFillFeedback = gapFillFeedback?.chapterNumber === selectedDraft.chapterNumber
    ? gapFillFeedback
    : null;

  useEffect(() => {
    const end = selectedDraft?.content.length ?? 0;
    setSelection({ start: end, end });
    selectionTouchedRef.current = false;
  }, [selectedDraft?.chapterNumber]);

  useEffect(() => {
    setGapFillContent(currentGapFillFeedback?.content ?? "");
  }, [currentGapFillFeedback?.chapterNumber, currentGapFillFeedback?.content, currentGapFillFeedback?.gapId]);

  if (!selectedDraft || !selectedPlanChapter) return null;

  const handleContentChange = (content: string) => {
    onChange(updateDraftSet(drafts, selectedDraft.chapterNumber, {
      content,
      status: content.trim() ? "draft" : "empty",
      stateChangeStatus: "pending"
    }));
  };

  const captureSelection = (element: HTMLTextAreaElement) => {
    selectionTouchedRef.current = true;
    setSelection({ start: element.selectionStart, end: element.selectionEnd });
  };

  const requestGapFill = (gapId: OpeningChapterGapId, label: string, message: string) => {
    const fallbackPosition = selectedDraft.content.length;
    const activeSelection = selectionTouchedRef.current
      ? selection
      : { start: fallbackPosition, end: fallbackPosition };
    onFillGap?.({
      chapterNumber: selectedDraft.chapterNumber,
      gapId,
      gapLabel: label,
      gapMessage: message,
      selectionStart: activeSelection.start,
      selectionEnd: activeSelection.end
    });
  };

  const handleTitleChange = (title: string) => {
    onChange(updateDraftSet(drafts, selectedDraft.chapterNumber, { title }));
  };

  const handleAcknowledgePlan = () => {
    onChange(updateDraftSet(drafts, selectedDraft.chapterNumber, {
      sourcePlanSignature: getOpeningChapterPlanSignature(selectedPlanChapter),
      usedFactIds: selectedPlanChapter.requiredFactIds
    }));
  };

  const getGenerationContextCopy = (summary: OpeningChapterDraftGenerationContextSummary | undefined) => {
    if (!summary) return "本次只会生成当前章，不会自动确认世界状态。";

    const parts = [
      summary.fieldGroups.length > 0 ? summary.fieldGroups.join("、") : "",
      summary.factIds.length > 0 ? `${summary.factIds.length} 条事实` : "",
      summary.confirmedEventIds.length > 0 ? `${summary.confirmedEventIds.length} 条已确认事件` : "",
      summary.previousChapterNumber ? `承接第 ${summary.previousChapterNumber} 章结尾` : ""
    ].filter(Boolean);

    return parts.length > 0
      ? `本次取材：${parts.join(" · ")}。`
      : "本次只会生成当前章，不会自动确认世界状态。";
  };
  const canConfirmCurrentChapter = selectedDraft.content.trim().length > 0 && checkCounts.blockers === 0 && !stale;
  const currentChapterConfirmed = selectedDraft.status === "confirmed" && selectedDraft.stateChangeStatus === "confirmed";

  return (
    <section className="opening-draft-panel" aria-label="前三章正文试写">
      <header className="opening-draft-header">
        <div>
          <p className="eyebrow">正文试写</p>
          <h2>前三章草稿</h2>
        </div>
        <div className="opening-draft-header-meta">
          <span>{draftCounts.draft + draftCounts.confirmed}/3 章有内容</span>
          <span className={`opening-draft-save-state ${saveState}`} aria-live="polite">
            {saveState === "saving" ? <RefreshCw size={13} className="spinning" aria-hidden /> : <Save size={13} aria-hidden />}
            {saveStateCopy[saveState]}
          </span>
        </div>
      </header>

      <div className="opening-draft-tabs" role="tablist" aria-label="试写章节">
        {sortedDrafts.map((draft) => {
          const stats = getOpeningChapterDraftStats(draft.content);
          const isSelected = draft.chapterNumber === selectedDraft.chapterNumber;
          return (
            <button
              key={draft.chapterNumber}
              type="button"
              role="tab"
              id={`opening-draft-tab-${draft.chapterNumber}`}
              aria-controls="opening-draft-workspace"
              aria-selected={isSelected}
              className={isSelected ? "active" : ""}
              onClick={() => setSelectedChapterNumber(draft.chapterNumber)}
            >
              <span>{String(draft.chapterNumber).padStart(2, "0")}</span>
              <strong>第 {draft.chapterNumber} 章</strong>
              <small>{stats.characterCount > 0 ? `${stats.characterCount} 字` : draftStatusCopy[draft.status]}</small>
            </button>
          );
        })}
      </div>

      {stale && (
        <div className="opening-draft-stale-alert">
          <CircleAlert size={16} aria-hidden />
          <div>
            <strong>计划已变更，正文未被覆盖</strong>
            <p>对照下方当前计划检查草稿；确认已经适配后，再标记为当前版本。</p>
          </div>
          <button type="button" className="secondary-button compact" onClick={handleAcknowledgePlan}>
            <BookOpenCheck size={14} aria-hidden />
            已核对当前计划
          </button>
        </div>
      )}

      <div
        className="opening-draft-workspace"
        id="opening-draft-workspace"
        role="tabpanel"
        aria-labelledby={`opening-draft-tab-${selectedDraft.chapterNumber}`}
      >
        <aside className="opening-draft-plan-brief" aria-label={`第 ${selectedDraft.chapterNumber} 章计划摘要`}>
          <div className="opening-draft-section-title">
            <BookOpenCheck size={15} aria-hidden />
            <strong>当前章计划</strong>
          </div>
          <PlanBriefItem label="读者问题" value={selectedPlanChapter.readerQuestion} />
          <PlanBriefItem label="场景任务" value={selectedPlanChapter.sceneTask} />
          <PlanBriefItem label="爽点 / 压力" value={selectedPlanChapter.pressureOrPayoff} />
          <PlanBriefItem label="章末钩子" value={selectedPlanChapter.chapterHook} />
          <PlanBriefItem label="状态变化" value={selectedPlanChapter.stateChange} />
          <div className="opening-draft-facts">
            <span>依赖事实</span>
            <div>
              {selectedPlanChapter.requiredFactIds.length > 0
                ? selectedPlanChapter.requiredFactIds.map((factId) => <code key={factId}>{factId}</code>)
                : <small>尚未绑定</small>}
            </div>
          </div>
        </aside>

        <article className="opening-draft-writing-surface">
          <div className="opening-draft-writing-head">
            <div>
              <FilePenLine size={16} aria-hidden />
              <strong>第 {selectedDraft.chapterNumber} 章正文</strong>
            </div>
            <div className="opening-draft-writing-actions">
              <span>{selectedStats.characterCount} 字 · {selectedStats.paragraphCount} 段</span>
              <button
                type="button"
                className={`secondary-button compact ${currentChapterConfirmed ? "success" : ""}`}
                disabled={!onConfirm || isDraftOperationBusy || !canConfirmCurrentChapter || currentChapterConfirmed}
                onClick={() => onConfirm?.(selectedDraft.chapterNumber)}
              >
                {isConfirmingCurrentChapter ? <RefreshCw size={14} className="spinning" aria-hidden /> : <BookOpenCheck size={14} aria-hidden />}
                {currentChapterConfirmed ? "已确认当前章" : "确认当前章"}
              </button>
              <button
                type="button"
                className="secondary-button compact"
                disabled={!onGenerate || isDraftOperationBusy}
                onClick={() => onGenerate?.(selectedDraft.chapterNumber)}
              >
                {isGeneratingCurrentChapter ? <RefreshCw size={14} className="spinning" aria-hidden /> : <WandSparkles size={14} aria-hidden />}
                {selectedDraft.content.trim() ? "重新生成当前章" : "AI生成当前章"}
              </button>
            </div>
          </div>
          {currentConfirmationFeedback && (
            <div className={`opening-draft-generation-alert ${currentConfirmationFeedback.tone}`}>
              <strong>{currentConfirmationFeedback.tone === "success" ? "当前章确认已更新" : "当前章确认失败"}</strong>
              <p>{currentConfirmationFeedback.message}</p>
              <small>确认后，本章状态变化会进入世界状态，供后续章节生成按“已确认事件”引用。</small>
            </div>
          )}
          {currentGenerationFeedback && (
            <div className={`opening-draft-generation-alert ${currentGenerationFeedback.tone}`}>
              <strong>
                {currentGenerationFeedback.meta?.source === "llm"
                  ? "真实 AI 已参与当前章试写"
                  : currentGenerationFeedback.tone === "pending"
                    ? "正在生成当前章"
                    : "当前章生成失败"}
              </strong>
              <p>{currentGenerationFeedback.message}</p>
              <small>{getGenerationContextCopy(currentGenerationFeedback.contextSummary)}</small>
            </div>
          )}
          {currentGapFillFeedback && (
            <div className={`opening-gap-fill-preview ${currentGapFillFeedback.tone}`} aria-live="polite">
              <div className="opening-gap-fill-preview-head">
                <div>
                  {currentGapFillFeedback.tone === "pending"
                    ? <RefreshCw size={14} className="spinning" aria-hidden />
                    : <WandSparkles size={14} aria-hidden />}
                  <strong>{currentGapFillFeedback.gapLabel}</strong>
                </div>
                <button
                  type="button"
                  className="icon-button compact"
                  aria-label="关闭补写建议"
                  title="关闭补写建议"
                  disabled={isDraftOperationBusy}
                  onClick={onDismissGapFill}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              <p>{currentGapFillFeedback.message}</p>
              {currentGapFillFeedback.tone === "success" && currentGapFillFeedback.content && (
                <>
                  <textarea
                    value={gapFillContent}
                    onChange={(event) => setGapFillContent(event.target.value)}
                    aria-label="AI 补写候选"
                    spellCheck={false}
                  />
                  <div className="opening-gap-fill-preview-actions">
                    <small>
                      {currentGapFillFeedback.selectionEnd > currentGapFillFeedback.selectionStart
                        ? "将替换请求时选中的正文"
                        : "将插入请求时的光标位置"}
                    </small>
                    <button
                      type="button"
                      className="primary-button compact"
                      disabled={!gapFillContent.trim() || !onApplyGapFill || isDraftOperationBusy}
                      onClick={() => onApplyGapFill?.({ ...currentGapFillFeedback, content: gapFillContent })}
                    >
                      <BookOpenCheck size={14} aria-hidden />
                      {isDraftOperationBusy ? "保存中" : "采纳到正文"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <label className="opening-draft-title-field">
            <span>章节标题</span>
            <input value={selectedDraft.title} onChange={(event) => handleTitleChange(event.target.value)} />
          </label>
          <label className="opening-draft-content-field">
            <span className="sr-only">正文内容</span>
            <textarea
              ref={textareaRef}
              value={selectedDraft.content}
              onChange={(event) => {
                handleContentChange(event.target.value);
                captureSelection(event.currentTarget);
              }}
              onSelect={(event) => captureSelection(event.currentTarget)}
              spellCheck={false}
              placeholder={`从第 ${selectedDraft.chapterNumber} 章的开场动作、困境或对话开始写…`}
            />
          </label>
          <p className="opening-draft-writing-note">
            只会按当前章手动调用 AI；确认当前章后，状态变化才会写回世界状态。
          </p>
        </article>

        <aside className="opening-draft-checks" aria-label="正文本地检查">
          <div className="opening-draft-checks-head">
            <div>
              <AlertCircle size={15} aria-hidden />
              <strong>本地检查</strong>
            </div>
            <span>{checkCounts.blockers > 0 ? `${checkCounts.blockers} 项阻断` : `${checkCounts.warnings} 项提醒`}</span>
          </div>
          <p className="opening-draft-checks-note">只按篇幅、分段、词语和计划字段检查，不代表 AI 内容审稿。</p>
          <div className="opening-draft-check-list">
            {checks.map((check) => {
              const fillable = check.tone !== "pass"
                && aiFillableCheckIds.has(check.id as OpeningChapterGapId)
                && selectedDraft.content.trim().length > 0
                && !stale;
              const fillingThisGap = gapFilling?.chapterNumber === selectedDraft.chapterNumber
                && gapFilling.gapId === check.id;

              return (
                <div className={`opening-draft-check-item ${check.tone}`} key={check.id}>
                  {check.tone === "pass"
                    ? <CheckCircle2 size={14} aria-hidden />
                    : <CircleAlert size={14} aria-hidden />}
                  <div>
                    <div className="opening-draft-check-title-row">
                      <strong>{check.label}</strong>
                      {fillable && (
                        <button
                          type="button"
                          className="opening-draft-check-ai"
                          disabled={!onFillGap || isDraftOperationBusy}
                          onClick={() => requestGapFill(check.id as OpeningChapterGapId, check.label, check.message)}
                          title={`用 AI 补写“${check.label}”`}
                        >
                          {fillingThisGap
                            ? <RefreshCw size={12} className="spinning" aria-hidden />
                            : <WandSparkles size={12} aria-hidden />}
                          {fillingThisGap ? "补写中" : "AI补写"}
                        </button>
                      )}
                    </div>
                    <p>{check.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function PlanBriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="opening-draft-plan-item">
      <span>{label}</span>
      <p>{value || "待补充"}</p>
    </div>
  );
}
