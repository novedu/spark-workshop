"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  ListChecks,
  RefreshCw,
  RotateCcw,
  X
} from "lucide-react";
import { llmProvider } from "@/lib/llm";
import { llmSourceCopy } from "@/lib/status-copy";
import { formatTheoryEvidence, getSeverityLabel, matchTheorySuggestions, runTheoryChecks } from "@/lib/theory-checker";
import { getTheoryById, v1Theories } from "@/lib/theory-library";
import type {
  OpeningChapterPlan,
  OutlineNode,
  TheoryCheckResult,
  TheoryDefinition,
  TheoryMatch,
  TheorySuggestionState,
  TheorySuggestionStateKind,
  TheorySuggestion as LlmTheorySuggestion,
  V1TheoryId
} from "@/types/product";

interface TheoryCheckerPanelProps {
  nodes: OutlineNode[];
  openingChapterPlan?: OpeningChapterPlan | null;
  selectedNodeId: string | null;
  theorySuggestionStates?: Record<string, TheorySuggestionState>;
  onTheorySuggestionStatesChange?: (states: Record<string, TheorySuggestionState>) => void;
}

type TheoryPanelItem = {
  theory: TheoryDefinition;
  match: TheoryMatch;
  checkResult?: TheoryCheckResult;
  reason: string;
};

type ExplanationEntry = LlmTheorySuggestion & {
  source: "llm" | "fallback" | "cache" | "mock";
  loading: boolean;
};

const DEFAULT_VISIBLE_THEORY_LIMIT = 5;

const plainExplanations: Record<V1TheoryId, string> = {
  T01: "先看这个阶段有没有清楚的起点、关门点和推进方向，别让读者读着读着找不到主线。",
  T02: "主角要先让读者愿意站他这边，哪怕只是一个小小的善意、困境或不服输的瞬间。",
  T03: "故事要有落差：主角想要的东西，现实不能轻易给，否则冲突就软了。",
  T04: "埋下的设定、道具和秘密后面要响，读者记住了，你就得给回声。",
  T07: "章节推进最好有憋屈、准备、爆发、收获和新危机的循环，爽点才会一波接一波。",
  T11: "金手指可以强，但要有代价、限制或反噬，不然世界规则会被主角一脚踩扁。",
  T12: "同一种变强和装点不能连续重复，奖励要升级、变形或换一种满足感。",
  T13: "世界里的势力、规则和职业要有存在理由，不能只是为了热闹堆设定。"
};

const matchReasonLabels: Record<TheoryMatch["reasons"][number], string> = {
  rule_fail: "本地规则判定为失败",
  rule_warning: "本地规则给出警告",
  node_relevant: "和当前节点类型相关",
  keyword_hit: "当前内容出现相关关键词",
  content_gap: "当前内容存在结构缺口"
};

const getMatchReasonText = (match: TheoryMatch) => {
  if (match.reasons.length === 0) {
    return "暂未和当前节点强相关，作为备用理论保留在全部理论里。";
  }

  return match.reasons.map((reason) => matchReasonLabels[reason]).join("，");
};

const getNodeStructureSignature = (nodes: OutlineNode[]) =>
  nodes
    .map((node) => `${node.id}:${node.kind}:${node.order}:${node.parentId ?? ""}`)
    .join("|");

const getNodeContentSignature = (nodes: OutlineNode[]) =>
  nodes
    .map((node) => `${node.id}:${node.title}:${node.content}:${JSON.stringify(node.metadata ?? {})}`)
    .join("|");

const getOpeningPlanSignature = (plan?: OpeningChapterPlan | null) =>
  plan
    ? plan.chapters
        .map((chapter) =>
          [
            chapter.chapterNumber,
            chapter.title,
            chapter.readerQuestion,
            chapter.sceneTask,
            chapter.pressureOrPayoff,
            chapter.chapterHook,
            chapter.requiredFactIds.join(","),
            chapter.stateChange,
            chapter.notes ?? ""
          ].join(":")
        )
        .join("|")
    : "";

const cloneOutlineNodes = (nodes: OutlineNode[]) =>
  nodes.map((node) => ({
    ...node,
    metadata: node.metadata ? { ...node.metadata } : undefined
  }));

const formatCheckTime = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(timestamp);

const buildFallbackExplanation = (
  result: TheoryCheckResult,
  theory: TheoryDefinition | undefined
): ExplanationEntry => ({
  theoryId: result.theoryId,
  plainExplanation: `本地规则先提示：${result.message}`,
  theoryExplanation: theory
    ? `${theory.academicName}的核心是：${theory.coreIdea}`
    : "当前命中本地规则，建议先补齐结构缺口，再继续扩写。",
  suggestions: result.rescueOptions.slice(0, 3),
  canIgnore: result.severity !== "fail",
  source: "fallback",
  loading: false
});

export function TheoryCheckerPanel({
  nodes,
  openingChapterPlan,
  selectedNodeId,
  theorySuggestionStates = {},
  onTheorySuggestionStatesChange
}: TheoryCheckerPanelProps) {
  const [expandedTheoryId, setExpandedTheoryId] = useState<V1TheoryId | null>(null);
  const [visibleTheoryExplanationId, setVisibleTheoryExplanationId] = useState<V1TheoryId | null>(null);
  const [explanationByTheoryId, setExplanationByTheoryId] = useState<Record<string, ExplanationEntry>>({});
  const [showAllTheories, setShowAllTheories] = useState(false);
  const [showHandledTheories, setShowHandledTheories] = useState(false);
  const [showOverflowSuggestions, setShowOverflowSuggestions] = useState(false);
  const [checkedNodes, setCheckedNodes] = useState<OutlineNode[]>(() => cloneOutlineNodes(nodes));
  const [checkedOpeningChapterPlan, setCheckedOpeningChapterPlan] = useState<OpeningChapterPlan | null>(() => openingChapterPlan ?? null);
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  const [recheckStatus, setRecheckStatus] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const currentStructureSignature = useMemo(() => getNodeStructureSignature(nodes), [nodes]);
  const checkedStructureSignature = useMemo(() => getNodeStructureSignature(checkedNodes), [checkedNodes]);
  const currentContentSignature = useMemo(() => getNodeContentSignature(nodes), [nodes]);
  const checkedContentSignature = useMemo(() => getNodeContentSignature(checkedNodes), [checkedNodes]);
  const currentOpeningPlanSignature = useMemo(() => getOpeningPlanSignature(openingChapterPlan), [openingChapterPlan]);
  const checkedOpeningPlanSignature = useMemo(() => getOpeningPlanSignature(checkedOpeningChapterPlan), [checkedOpeningChapterPlan]);
  const hasUncheckedChanges =
    currentContentSignature !== checkedContentSignature ||
    currentOpeningPlanSignature !== checkedOpeningPlanSignature;

  useEffect(() => {
    if (currentStructureSignature !== checkedStructureSignature) {
      setCheckedNodes(cloneOutlineNodes(nodes));
      setCheckedOpeningChapterPlan(openingChapterPlan ?? null);
      setCheckedAt(Date.now());
      setExpandedTheoryId(null);
      setVisibleTheoryExplanationId(null);
      setShowOverflowSuggestions(false);
      setRecheckStatus(null);
    }
  }, [checkedStructureSignature, currentStructureSignature, nodes, openingChapterPlan]);

  useEffect(() => {
    if (hasUncheckedChanges) {
      setRecheckStatus(null);
    }
  }, [hasUncheckedChanges]);

  const handleRecheckTheories = () => {
    const now = Date.now();
    setCheckedNodes(cloneOutlineNodes(nodes));
    setCheckedOpeningChapterPlan(openingChapterPlan ?? null);
    setCheckedAt(now);
    setRecheckStatus(`已重新检测 ${formatCheckTime(now)}`);
    setExpandedTheoryId(null);
    setVisibleTheoryExplanationId(null);
    setShowOverflowSuggestions(false);
    setTimeout(() => setRecheckStatus(null), 3000);
  };

  const checkResultByTheoryId = useMemo(() => {
    const results = checkedNodes.length > 0
      ? runTheoryChecks({ outlineNodes: checkedNodes, openingChapterPlan: checkedOpeningChapterPlan ?? undefined })
      : [];
    return new Map(results.map((result) => [result.theoryId, result]));
  }, [checkedNodes, checkedOpeningChapterPlan]);

  const checkResults = useMemo(() => [...checkResultByTheoryId.values()], [checkResultByTheoryId]);
  const theoryMatches = useMemo(
    () =>
      checkedNodes.length > 0
        ? matchTheorySuggestions(
            { outlineNodes: checkedNodes, openingChapterPlan: checkedOpeningChapterPlan ?? undefined },
            selectedNodeId
          )
        : [],
    [checkedNodes, checkedOpeningChapterPlan, selectedNodeId]
  );
  const checkResultSignature = useMemo(
    () =>
      checkResults
        .map((result) => `${result.theoryId}:${result.severity}:${result.location}:${result.message}`)
        .join("|"),
    [checkResults]
  );

  useEffect(() => {
    if (checkResults.length === 0) {
      setExplanationByTheoryId({});
      return;
    }

    const fallbackEntries = Object.fromEntries(
      checkResults.map((result) => [
        result.theoryId,
        buildFallbackExplanation(result, getTheoryById(result.theoryId))
      ])
    );

    setExplanationByTheoryId(fallbackEntries);
  }, [checkResultSignature, checkResults]);

  const loadExplanationForResult = async (result: TheoryCheckResult) => {
    const current = explanationByTheoryId[result.theoryId];
    if (current?.loading || current?.source === "llm" || current?.source === "cache" || current?.source === "mock") {
      return;
    }

    const fallback = buildFallbackExplanation(result, getTheoryById(result.theoryId));
    setExplanationByTheoryId((entries) => ({
      ...entries,
      [result.theoryId]: {
        ...fallback,
        loading: true
      }
    }));

    try {
      const explanation = await llmProvider.explainTheoryCheck({
        theoryId: result.theoryId,
        status: result.severity,
        location: result.location,
        reason: result.message,
        evidence: (result.evidence ?? []).map(formatTheoryEvidence)
      });
      const source =
        explanation.llmMeta?.source === "cache"
          ? "cache"
          : explanation.llmMeta?.source === "mock"
            ? "mock"
            : "llm";

      setExplanationByTheoryId((entries) => ({
        ...entries,
        [result.theoryId]: {
          ...explanation,
          source,
          loading: false
        }
      }));
    } catch (error) {
      console.warn("Theory explanation failed, using local fallback:", error);
      setExplanationByTheoryId((entries) => ({
        ...entries,
        [result.theoryId]: {
          ...fallback,
          loading: false
        }
      }));
    }
  };

  const handleSetSuggestionState = (
    theoryId: V1TheoryId,
    state: TheorySuggestionStateKind | null,
    checkResult?: TheoryCheckResult
  ) => {
    const nextStates = { ...theorySuggestionStates };

    if (!state) {
      delete nextStates[theoryId];
      onTheorySuggestionStatesChange?.(nextStates);
      return;
    }

    nextStates[theoryId] = {
      theoryId,
      state,
      updatedAt: new Date().toISOString(),
      ...(selectedNodeId ? { nodeId: selectedNodeId } : {}),
      contentSignature: checkedContentSignature,
      ...(checkResult
        ? { checkSignature: `${checkResult.severity}:${checkResult.location}:${checkResult.message}` }
        : {})
    };
    onTheorySuggestionStatesChange?.(nextStates);
  };

  const suggestions = useMemo<TheoryPanelItem[]>(() => {
    return theoryMatches
      .map((match) => {
        const theory = getTheoryById(match.theoryId);
        if (!theory) return null;
        const checkResult = checkResultByTheoryId.get(match.theoryId);

        return {
          theory,
          match,
          ...(checkResult ? { checkResult } : {}),
          reason: getMatchReasonText(match)
        };
      })
      .filter((item): item is TheoryPanelItem => item !== null);
  }, [checkResultByTheoryId, theoryMatches]);

  const getSuggestionState = (suggestion: TheoryPanelItem) => theorySuggestionStates[suggestion.theory.id]?.state;

  const activeSuggestions = suggestions.filter((suggestion) => !getSuggestionState(suggestion));
  const resolvedStillHitSuggestions = suggestions.filter(
    (suggestion) => getSuggestionState(suggestion) === "resolved" && suggestion.match.level === "needs_fix"
  );
  const handledSuggestions = suggestions.filter(
    (suggestion) => getSuggestionState(suggestion) && !resolvedStillHitSuggestions.includes(suggestion)
  );
  const relevantCount = activeSuggestions.filter((suggestion) => suggestion.match.reasons.includes("node_relevant")).length;
  const failCount = activeSuggestions.filter((suggestion) => suggestion.match.severity === "fail").length;
  const warningCount = activeSuggestions.filter((suggestion) => suggestion.match.severity === "warning").length;
  const actionableCount = activeSuggestions.filter((suggestion) => suggestion.match.level === "needs_fix").length;
  const statusClass =
    failCount > 0 ? "danger" : warningCount > 0 || resolvedStillHitSuggestions.length > 0 ? "warning" : "success";
  const statusText =
    nodes.length === 0
      ? `V1 ${v1Theories.length} 条`
      : failCount > 0
        ? `${failCount} 项必改`
        : warningCount > 0
          ? `${warningCount} 项待看`
          : resolvedStillHitSuggestions.length > 0
            ? `${resolvedStillHitSuggestions.length} 项仍命中`
          : "暂无硬伤";

  const needsFixSuggestions = activeSuggestions.filter((suggestion) => suggestion.match.level === "needs_fix");
  const suggestCheckSuggestions = activeSuggestions.filter((suggestion) => suggestion.match.level === "suggest_check");
  const allTheorySuggestions = activeSuggestions.filter((suggestion) => suggestion.match.level === "hidden");
  const visibleNeedsFixSuggestions = needsFixSuggestions.slice(0, DEFAULT_VISIBLE_THEORY_LIMIT);
  const remainingVisibleSlots = Math.max(0, DEFAULT_VISIBLE_THEORY_LIMIT - visibleNeedsFixSuggestions.length);
  const visibleSuggestCheckSuggestions = suggestCheckSuggestions.slice(0, remainingVisibleSlots);
  const overflowSuggestions = [
    ...needsFixSuggestions.slice(visibleNeedsFixSuggestions.length),
    ...suggestCheckSuggestions.slice(visibleSuggestCheckSuggestions.length)
  ];
  const visibleFocusCount = visibleNeedsFixSuggestions.length + visibleSuggestCheckSuggestions.length;

  const renderTheoryCard = (suggestion: TheoryPanelItem, mode: "needs-fix" | "suggest-check" | "reference") => {
    const theoryId = suggestion.theory.id as V1TheoryId;
    const expanded = expandedTheoryId === theoryId;
    const checkResult = suggestion.checkResult;
    const explanation = checkResult ? explanationByTheoryId[checkResult.theoryId] : undefined;
    const displayPlainExplanation = explanation?.plainExplanation ?? suggestion.match.message ?? plainExplanations[theoryId];
    const theoryExplanation = explanation?.theoryExplanation ?? suggestion.theory.coreIdea;
    const rescueOptions = explanation?.suggestions ?? suggestion.match.rescueOptions.slice(0, 3);
    const handledState = theorySuggestionStates[theoryId]?.state;
    const canIgnore = explanation?.canIgnore ?? (suggestion.match.severity !== "fail");
    const showTheoryExplanation = visibleTheoryExplanationId === theoryId;
    const evidence = suggestion.match.evidence.slice(0, 4);

    return (
      <article
        className={`check-item theory-suggestion ${mode} ${suggestion.match.reasons.includes("node_relevant") ? "relevant" : ""} ${suggestion.match.severity ? `has-check ${suggestion.match.severity}` : ""} ${handledState ? `is-${handledState}` : ""}`}
        key={theoryId}
      >
        <div className="check-item-content">
          <div className="check-item-header">
            <span className="check-item-id">{theoryId}</span>
            <span className="check-item-name">{suggestion.theory.plainName}</span>
            {mode === "needs-fix" && <span className="theory-relevance urgent">需要修改</span>}
            {mode === "suggest-check" && <span className="theory-relevance">建议检查</span>}
            {mode === "reference" && <span className="theory-relevance muted">备用理论</span>}
            {handledState && (
              <span className={`suggestion-state-badge ${handledState}`}>
                {handledState === "ignored" ? "已忽略" : "已处理"}
              </span>
            )}
            <button
              className="theory-card-toggle"
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? "收起诊断详情" : "展开诊断详情"}
              onClick={() => {
                setExpandedTheoryId(expanded ? null : theoryId);
                if (expanded) {
                  setVisibleTheoryExplanationId(null);
                }
              }}
            >
              {expanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
            </button>
          </div>

          {expanded && (
            <div className="theory-card-expanded">
              {suggestion.match.severity && (
                <div className="theory-card-meta">
                  <span className={`rule-check-badge ${suggestion.match.severity}`}>
                    {getSeverityLabel(suggestion.match.severity)}
                  </span>
                </div>
              )}
              {suggestion.match.level === "needs_fix" ? (
                <div className="diagnosis-fields">
                  <div className="diagnosis-field">
                    <span>问题</span>
                    <p>{suggestion.match.message}</p>
                  </div>
                  <div className="diagnosis-field compact">
                    <span>位置</span>
                    <p>{suggestion.match.location}</p>
                  </div>
                  <div className="diagnosis-field">
                    <span>建议改法</span>
                    <div className="rule-rescue-options">
                      {rescueOptions.map((option) => (
                        <span key={option}>{option}</span>
                      ))}
                    </div>
                  </div>
                  {evidence.length > 0 && (
                    <div className="diagnosis-field">
                      <span>证据</span>
                      <div className="theory-evidence-list">
                        {evidence.map((item) => (
                          <div className={`theory-evidence-item ${item.source}`} key={item.id}>
                            <strong>{item.label}</strong>
                            <p>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="check-item-message">{displayPlainExplanation}</p>
                  {evidence.length > 0 && (
                    <div className="theory-evidence-list compact">
                      {evidence.slice(0, 2).map((item) => (
                        <div className={`theory-evidence-item ${item.source}`} key={item.id}>
                          <strong>{item.label}</strong>
                          <p>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <p className="theory-reason">
                <strong>为什么看：</strong>
                {suggestion.reason}
              </p>

              {handledState === "resolved" && suggestion.match.level === "needs_fix" && (
                <p className="handled-warning">
                  已标记处理，但当前规则仍命中。内容可能还没补到点上，建议重新检查目标、阻碍、代价或回收是否足够具体。
                </p>
              )}

              {checkResult && (
                <div className="suggestion-actions">
                  {handledState ? (
                    <button
                      type="button"
                      className="suggestion-action"
                      onClick={() => handleSetSuggestionState(theoryId, null)}
                    >
                      <RotateCcw size={13} aria-hidden />
                      恢复
                    </button>
                  ) : (
                    <>
                      {canIgnore && (
                        <button
                          type="button"
                          className="suggestion-action"
                          onClick={() => handleSetSuggestionState(theoryId, "ignored", checkResult)}
                        >
                          <X size={13} aria-hidden />
                          忽略
                        </button>
                      )}
                      <button
                        type="button"
                        className="suggestion-action primary"
                        onClick={() => handleSetSuggestionState(theoryId, "resolved", checkResult)}
                      >
                        <Check size={13} aria-hidden />
                        标记已处理
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                className="theory-expand-button"
                type="button"
                onClick={() => {
                  setVisibleTheoryExplanationId(showTheoryExplanation ? null : theoryId);
                  if (checkResult) {
                    void loadExplanationForResult(checkResult);
                  }
                }}
              >
                {showTheoryExplanation ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                {showTheoryExplanation ? "收起理论解释" : "理论解释"}
                {showTheoryExplanation && explanation && (
                  <span className={`llm-explanation-badge ${explanation.source}`}>
                    {explanation.loading
                      ? "解释中"
                      : explanation.source === "llm"
                        ? "AI解释"
                        : explanation.source === "cache"
                          ? "缓存"
                          : explanation.source === "mock"
                            ? llmSourceCopy.mock.label
                            : "本地解释"}
                  </span>
                )}
              </button>
              {showTheoryExplanation && explanation && (
                <div className="theory-detail">
                  <BookOpen size={15} aria-hidden />
                  <div>
                    <strong>{suggestion.theory.academicName}</strong>
                    <p>{theoryExplanation}</p>
                    <small>AI 规则：{suggestion.theory.aiRule}</small>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="theory-checker-panel">
      <div className="checker-header">
        <div className="checker-heading">
          <div className="checker-title">
            <Brain size={16} aria-hidden />
            <span>盘书诊断</span>
          </div>
          <p>本地规则先判断，AI 解释只在展开时调用。</p>
        </div>
        <span className={`status-summary ${statusClass}`}>{statusText}</span>
      </div>

      <div className="checker-content">
        <div className="check-results-list">
          <div className="node-theory-context">
            <span>{selectedNode ? selectedNode.title : "未选择节点"}</span>
            <small>
              {selectedNode
                ? `上次检测命中 ${actionableCount} 项待处理，另有 ${relevantCount} 条节点相关理论可复查`
                : "先选择节点查看匹配理论"}
            </small>
            <div className="theory-recheck-row">
              <span className={`theory-stale-indicator ${hasUncheckedChanges ? "stale" : ""}`}>
                {recheckStatus || (hasUncheckedChanges ? "有未检测修改" : `结果已是当前内容 · ${formatCheckTime(checkedAt)}`)}
              </span>
              <button
                type="button"
                className="recheck-theory-button"
                onClick={handleRecheckTheories}
                disabled={nodes.length === 0}
              >
                <RefreshCw size={13} aria-hidden />
                重新检测
              </button>
            </div>
          </div>

          <div className="results-list">
            <section className="diagnosis-section" aria-label="需要修改">
              <div className="diagnosis-section-header">
                <div>
                  <strong>需要修改</strong>
                  <small>
                    {overflowSuggestions.length > 0
                      ? `默认展示最值得处理的 ${visibleFocusCount} 条`
                      : "规则明确命中的硬伤或风险"}
                  </small>
                </div>
                <span>{needsFixSuggestions.length}</span>
              </div>
              {visibleNeedsFixSuggestions.length > 0 ? (
                visibleNeedsFixSuggestions.map((suggestion) => renderTheoryCard(suggestion, "needs-fix"))
              ) : (
                <div className="diagnosis-empty">
                  <Check size={15} aria-hidden />
                  当前没有明确硬伤，先继续补大纲内容。
                </div>
              )}
            </section>

            {visibleSuggestCheckSuggestions.length > 0 && (
              <section className="diagnosis-section" aria-label="建议检查">
                <div className="diagnosis-section-header">
                  <div>
                    <strong>建议检查</strong>
                    <small>和当前节点相关，但不是强制修改项</small>
                  </div>
                  <span>{suggestCheckSuggestions.length}</span>
                </div>
                {visibleSuggestCheckSuggestions.map((suggestion) => renderTheoryCard(suggestion, "suggest-check"))}
              </section>
            )}

            {overflowSuggestions.length > 0 && (
              <section className="diagnosis-section overflow-diagnosis-section" aria-label="更多诊断">
                <button
                  type="button"
                  className="show-all-theories-button"
                  onClick={() => setShowOverflowSuggestions((current) => !current)}
                  aria-expanded={showOverflowSuggestions}
                >
                  <ListChecks size={14} aria-hidden />
                  {showOverflowSuggestions ? "收起更多诊断" : `查看其余诊断（${overflowSuggestions.length}）`}
                  {showOverflowSuggestions ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                </button>
                {showOverflowSuggestions &&
                  overflowSuggestions.map((suggestion) =>
                    renderTheoryCard(
                      suggestion,
                      suggestion.match.level === "needs_fix" ? "needs-fix" : "suggest-check"
                    )
                  )}
              </section>
            )}

            {resolvedStillHitSuggestions.length > 0 && (
              <section className="diagnosis-section unresolved-handled-section" aria-label="已处理但仍命中">
                <div className="diagnosis-section-header">
                  <div>
                    <strong>已处理但仍命中</strong>
                    <small>规则还认为内容没有补到点上</small>
                  </div>
                  <span>{resolvedStillHitSuggestions.length}</span>
                </div>
                {resolvedStillHitSuggestions.map((suggestion) => renderTheoryCard(suggestion, "needs-fix"))}
              </section>
            )}

            {handledSuggestions.length > 0 && (
              <section className="diagnosis-section handled-section" aria-label="处理记录">
                <button
                  type="button"
                  className="show-all-theories-button"
                  onClick={() => setShowHandledTheories((current) => !current)}
                  aria-expanded={showHandledTheories}
                >
                  <Check size={14} aria-hidden />
                  {showHandledTheories ? "收起处理记录" : `查看已忽略/已处理（${handledSuggestions.length}）`}
                  {showHandledTheories ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                </button>
                {showHandledTheories && handledSuggestions.map((suggestion) => renderTheoryCard(suggestion, "reference"))}
              </section>
            )}

            {allTheorySuggestions.length > 0 && (
              <section className="diagnosis-section theory-reference-section" aria-label="全部理论">
                <button
                  type="button"
                  className="show-all-theories-button"
                  onClick={() => setShowAllTheories((current) => !current)}
                  aria-expanded={showAllTheories}
                >
                  <ListChecks size={14} aria-hidden />
                  {showAllTheories ? "收起全部 V1 理论" : `查看全部 V1 理论（${allTheorySuggestions.length}）`}
                  {showAllTheories ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                </button>
                {showAllTheories && allTheorySuggestions.map((suggestion) => renderTheoryCard(suggestion, "reference"))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
