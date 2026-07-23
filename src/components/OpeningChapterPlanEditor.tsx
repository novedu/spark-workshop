"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { ListChecks, WandSparkles } from "lucide-react";
import { getOpeningChapterPlanCounts } from "@/lib/opening-chapter-plan";
import type { OpeningChapterPlan, OpeningChapterPlanChapter } from "@/types/product";

interface OpeningChapterPlanEditorProps {
  plan: OpeningChapterPlan;
  generating?: boolean;
  status?: string | null;
  suggestions?: string[];
  onChange: (plan: OpeningChapterPlan) => void;
  onGenerate: () => void;
}

type EditableChapterTextKey =
  | "title"
  | "readerQuestion"
  | "sceneTask"
  | "pressureOrPayoff"
  | "chapterHook"
  | "stateChange"
  | "notes";

export function OpeningChapterPlanEditor({
  plan,
  generating,
  status,
  suggestions = [],
  onChange,
  onGenerate
}: OpeningChapterPlanEditorProps) {
  const [selectedChapterNumber, setSelectedChapterNumber] = useState(1);
  const sortedChapters = useMemo(
    () => [...plan.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [plan.chapters]
  );
  const selectedChapter =
    sortedChapters.find((chapter) => chapter.chapterNumber === selectedChapterNumber) ?? sortedChapters[0];
  const counts = getOpeningChapterPlanCounts(plan);
  const completedCount = sortedChapters.filter((chapter) =>
    chapter.readerQuestion &&
    chapter.sceneTask &&
    chapter.pressureOrPayoff &&
    chapter.chapterHook &&
    chapter.stateChange
  ).length;

  const updateChapter = (updates: Partial<OpeningChapterPlanChapter>) => {
    if (!selectedChapter) return;
    onChange({
      ...plan,
      chapters: sortedChapters.map((chapter) =>
        chapter.chapterNumber === selectedChapter.chapterNumber
          ? {
              ...chapter,
              ...updates
            }
          : chapter
      ),
      updatedAt: new Date().toISOString()
    });
  };

  const updateTextField = (key: EditableChapterTextKey, value: string) => {
    updateChapter({ [key]: value });
  };

  const updateRequiredFactIds = (value: string) => {
    updateChapter({
      requiredFactIds: value
        .split(/[,\n，、]/)
        .map((item) => item.trim())
        .filter(Boolean)
    });
  };

  if (!selectedChapter) return null;

  return (
    <section className="opening-plan-panel" aria-label="前 30 章节奏表">
      <header className="opening-plan-header">
        <div>
          <p className="eyebrow">前 30 章</p>
          <h2>章节节奏表</h2>
          <p className="opening-plan-note">这是开书前 30 章的路线图，不是正文。每章写读者问题、场景任务、爽点 / 压迫、章末钩子和状态变化。</p>
        </div>
        <div className="opening-plan-actions">
          <span>{completedCount}/30 完成</span>
          <span>{counts.chaptersWithRequiredFacts} 章绑定事实</span>
          <button
            type="button"
            className="primary-button compact"
            onClick={onGenerate}
            disabled={generating}
            title="调用 AI 生成前 30 章节奏表"
          >
            <WandSparkles size={14} className={generating ? "spinning" : ""} aria-hidden />
            {generating ? "生成中" : "生成节奏表"}
          </button>
        </div>
      </header>

      {status && <div className="opening-plan-status">{status}</div>}
      {suggestions.length > 0 && (
        <div className="opening-plan-suggestions">
          {suggestions.slice(0, 3).map((suggestion) => (
            <span key={suggestion}>{suggestion}</span>
          ))}
        </div>
      )}

      <div className="opening-plan-workspace">
        <ol className="opening-chapter-list" aria-label="章节列表">
          {sortedChapters.map((chapter) => (
            <li key={chapter.chapterNumber} className={chapter.chapterNumber === selectedChapter.chapterNumber ? "active" : ""}>
              <button type="button" onClick={() => setSelectedChapterNumber(chapter.chapterNumber)}>
                <span>{String(chapter.chapterNumber).padStart(2, "0")}</span>
                <strong>{chapter.title.replace(/^第\d+章[：:]\s*/, "")}</strong>
                <small>{chapter.chapterHook || "章末钩子待补"}</small>
              </button>
            </li>
          ))}
        </ol>

        <article className="opening-chapter-editor">
          <div className="opening-chapter-editor-title">
            <ListChecks size={16} aria-hidden />
            <span>第 {selectedChapter.chapterNumber} 章</span>
            {selectedChapter.arcPhaseId && <small>{selectedChapter.arcPhaseId}</small>}
          </div>
          <label className="opening-chapter-field full-width">
            <span>章节标题</span>
            <input
              value={selectedChapter.title}
              onChange={(event) => updateTextField("title", event.target.value)}
              placeholder="第1章：开局钩子"
            />
          </label>
          <div className="opening-chapter-field-grid">
            <OpeningChapterField
              label="读者问题"
              value={selectedChapter.readerQuestion}
              onChange={(event) => updateTextField("readerQuestion", event.target.value)}
            />
            <OpeningChapterField
              label="场景任务"
              value={selectedChapter.sceneTask}
              onChange={(event) => updateTextField("sceneTask", event.target.value)}
            />
            <OpeningChapterField
              label="爽点 / 压迫"
              value={selectedChapter.pressureOrPayoff}
              onChange={(event) => updateTextField("pressureOrPayoff", event.target.value)}
            />
            <OpeningChapterField
              label="章末钩子"
              value={selectedChapter.chapterHook}
              onChange={(event) => updateTextField("chapterHook", event.target.value)}
            />
            <OpeningChapterField
              label="状态变化"
              value={selectedChapter.stateChange}
              onChange={(event) => updateTextField("stateChange", event.target.value)}
            />
            <label className="opening-chapter-field">
              <span>依赖事实</span>
              <textarea
                value={selectedChapter.requiredFactIds.join("、")}
                onChange={(event) => updateRequiredFactIds(event.target.value)}
                placeholder="protagonist-main、pressure-opening"
              />
            </label>
          </div>
          <label className="opening-chapter-field full-width">
            <span>备注</span>
            <textarea
              value={selectedChapter.notes ?? ""}
              onChange={(event) => updateTextField("notes", event.target.value)}
              placeholder="记录作者临时想法，不进入正文。"
            />
          </label>
        </article>
      </div>
    </section>
  );
}

function OpeningChapterField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="opening-chapter-field">
      <span>{label}</span>
      <textarea value={value} onChange={onChange} />
    </label>
  );
}
