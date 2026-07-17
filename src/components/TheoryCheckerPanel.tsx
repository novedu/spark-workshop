"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, Check, ChevronDown, ChevronRight, Lightbulb, RotateCcw, X } from "lucide-react";
import { llmProvider } from "@/lib/llm";
import { getSeverityLabel, runTheoryChecks } from "@/lib/theory-checker";
import { getTheoryById, v1Theories } from "@/lib/theory-library";
import type {
  OutlineNode,
  TheoryCheckResult,
  TheoryDefinition,
  TheorySuggestion as LlmTheorySuggestion,
  V1TheoryId
} from "@/types/product";

interface TheoryCheckerPanelProps {
  nodes: OutlineNode[];
  selectedNodeId: string | null;
}

type TheoryPanelItem = {
  theory: TheoryDefinition;
  relevant: boolean;
  checkResult?: TheoryCheckResult;
  plainExplanation: string;
  reason: string;
};

type ExplanationEntry = LlmTheorySuggestion & {
  source: "llm" | "fallback";
  loading: boolean;
};

const nodeTheoryMap: Record<string, V1TheoryId[]> = {
  world: ["T13"],
  protagonist: ["T02"],
  "golden-finger": ["T11", "T12"],
  "core-conflict": ["T03"],
  "act-1": ["T01", "T07"],
  "act-2": ["T01", "T07"],
  "act-3": ["T01", "T07"],
  foreshadowing: ["T04"]
};

const fallbackTheoryMap: Record<OutlineNode["kind"], V1TheoryId[]> = {
  world: ["T13"],
  protagonist: ["T02"],
  antagonist: ["T03", "T13"],
  goldenFinger: ["T11", "T12"],
  conflict: ["T03"],
  act: ["T01", "T07"],
  foreshadowing: ["T04"]
};

const plainExplanations: Record<V1TheoryId, string> = {
  T01: "先看这一幕有没有清楚的起点、关门点和推进方向，别让读者读着读着找不到主线。",
  T02: "主角要先让读者愿意站他这边，哪怕只是一个小小的善意、困境或不服输的瞬间。",
  T03: "故事要有落差：主角想要的东西，现实不能轻易给，否则冲突就软了。",
  T04: "埋下的设定、道具和秘密后面要响，读者记住了，你就得给回声。",
  T07: "章节推进最好有憋屈、准备、爆发、收获和新危机的循环，爽点才会一波接一波。",
  T11: "金手指可以强，但要有代价、限制或反噬，不然世界规则会被主角一脚踩扁。",
  T12: "同一种变强和装点不能连续重复，奖励要升级、变形或换一种满足感。",
  T13: "世界里的势力、规则和职业要有存在理由，不能只是为了热闹堆设定。"
};

const nodeReason = (node: OutlineNode | undefined, theoryId: V1TheoryId) => {
  if (!node) {
    return "未选中节点时，先展示 V1 必看的基础理论。";
  }

  const nodeName = node.title || "当前节点";
  const reasons: Record<V1TheoryId, string> = {
    T01: `${nodeName} 是篇章结构节点，需要先确认故事推进不会散。`,
    T02: `${nodeName} 直接决定读者愿不愿意跟主角走。`,
    T03: `${nodeName} 负责制造期望和现实的落差，是剧情发动机。`,
    T04: `${nodeName} 管的是埋线和回收，最怕只埋不响。`,
    T07: `${nodeName} 要安排爽点循环，避免只有设定没有推进。`,
    T11: `${nodeName} 涉及能力边界，需要检查外挂代价。`,
    T12: `${nodeName} 涉及成长节奏，需要避免重复满足感衰减。`,
    T13: `${nodeName} 关系到世界生态，需要确认每个设定有位置。`
  };

  return reasons[theoryId];
};

const getRelevantTheoryIds = (node: OutlineNode | undefined): V1TheoryId[] => {
  if (!node) {
    return ["T01", "T02", "T03", "T04", "T07", "T11", "T12", "T13"];
  }

  return nodeTheoryMap[node.id] ?? fallbackTheoryMap[node.kind];
};

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
  loading: true
});

export function TheoryCheckerPanel({ nodes, selectedNodeId }: TheoryCheckerPanelProps) {
  const [expandedTheoryId, setExpandedTheoryId] = useState<V1TheoryId | null>(null);
  const [explanationByTheoryId, setExplanationByTheoryId] = useState<Record<string, ExplanationEntry>>({});
  const [handledStateByTheoryId, setHandledStateByTheoryId] = useState<Record<string, "ignored" | "resolved">>({});

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const checkResultByTheoryId = useMemo(() => {
    const results = nodes.length > 0 ? runTheoryChecks({ outlineNodes: nodes }) : [];
    return new Map(results.map((result) => [result.theoryId, result]));
  }, [nodes]);

  const checkResults = useMemo(() => [...checkResultByTheoryId.values()], [checkResultByTheoryId]);
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
      setHandledStateByTheoryId({});
      return;
    }

    let cancelled = false;
    const fallbackEntries = Object.fromEntries(
      checkResults.map((result) => [
        result.theoryId,
        buildFallbackExplanation(result, getTheoryById(result.theoryId))
      ])
    );

    setExplanationByTheoryId(fallbackEntries);

    const explainResults = async () => {
      const entries = await Promise.all(
        checkResults.map(async (result) => {
          const fallback = fallbackEntries[result.theoryId];
          try {
            const explanation = await llmProvider.explainTheoryCheck({
              theoryId: result.theoryId,
              status: result.severity,
              location: result.location,
              reason: result.message,
              evidence: []
            });

            return [
              result.theoryId,
              {
                ...explanation,
                source: "llm",
                loading: false
              } satisfies ExplanationEntry
            ] as const;
          } catch (error) {
            console.warn("Theory explanation failed, using local fallback:", error);
            return [
              result.theoryId,
              {
                ...fallback,
                loading: false
              } satisfies ExplanationEntry
            ] as const;
          }
        })
      );

      if (!cancelled) {
        setExplanationByTheoryId(Object.fromEntries(entries));
      }
    };

    void explainResults();

    return () => {
      cancelled = true;
    };
  }, [checkResultSignature, checkResults]);

  useEffect(() => {
    setHandledStateByTheoryId((current) => {
      const activeIds = new Set<string>(checkResults.map((result) => result.theoryId));
      const nextEntries = Object.entries(current).filter(([theoryId]) => activeIds.has(theoryId));
      return nextEntries.length === Object.keys(current).length ? current : Object.fromEntries(nextEntries);
    });
  }, [checkResults]);

  const handleSetSuggestionState = (theoryId: string, state: "ignored" | "resolved" | null) => {
    setHandledStateByTheoryId((current) => {
      if (!state) {
        const rest = { ...current };
        delete rest[theoryId];
        return rest;
      }

      return {
        ...current,
        [theoryId]: state
      };
    });
  };

  const suggestions = useMemo<TheoryPanelItem[]>(() => {
    const relevantIds = getRelevantTheoryIds(selectedNode);
    const orderedIds = [
      ...relevantIds,
      ...v1Theories
        .map((theory) => theory.id as V1TheoryId)
        .filter((id) => !relevantIds.includes(id))
    ];

    return orderedIds
      .map((id) => {
        const theory = getTheoryById(id);
        if (!theory) return null;
        const checkResult = checkResultByTheoryId.get(id);

        return {
          theory,
          relevant: relevantIds.includes(id),
          ...(checkResult ? { checkResult } : {}),
          plainExplanation: plainExplanations[id],
          reason: nodeReason(selectedNode, id)
        };
      })
      .filter((item): item is TheoryPanelItem => item !== null);
  }, [checkResultByTheoryId, selectedNode]);

  const relevantCount = suggestions.filter((suggestion) => suggestion.relevant).length;
  const failCount = checkResults.filter((result) => result.severity === "fail").length;
  const warningCount = checkResults.filter((result) => result.severity === "warning").length;
  const statusClass = failCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success";
  const statusText =
    nodes.length === 0
      ? `V1 ${v1Theories.length} 条`
      : failCount > 0
        ? `${failCount} 个失败`
        : warningCount > 0
          ? `${warningCount} 个提示`
          : "本地通过";

  return (
    <div className="theory-checker-panel">
      <div className="checker-header">
        <div className="checker-title">
          <Brain size={16} aria-hidden />
          <span>理论建议</span>
        </div>
        <span className={`status-summary ${statusClass}`}>{statusText}</span>
      </div>

      <div className="checker-content">
        <div className="check-results-list">
          <div className="node-theory-context">
            <span>{selectedNode ? selectedNode.title : "未选择节点"}</span>
            <small>{selectedNode ? `优先匹配 ${relevantCount} 条相关理论` : "先选择节点查看匹配理论"}</small>
          </div>

          <div className="results-list">
            {suggestions.map((suggestion) => {
              const theoryId = suggestion.theory.id as V1TheoryId;
              const expanded = expandedTheoryId === theoryId;
              const checkResult = suggestion.checkResult;
              const explanation = checkResult ? explanationByTheoryId[checkResult.theoryId] : undefined;
              const displayPlainExplanation = explanation?.plainExplanation ?? suggestion.plainExplanation;
              const theoryExplanation = explanation?.theoryExplanation ?? suggestion.theory.coreIdea;
              const rescueOptions = explanation?.suggestions ?? checkResult?.rescueOptions.slice(0, 3) ?? [];
              const handledState = checkResult ? handledStateByTheoryId[checkResult.theoryId] : undefined;
              const canIgnore = explanation?.canIgnore ?? (checkResult?.severity !== "fail");

              return (
                <article
                  className={`check-item theory-suggestion ${suggestion.relevant ? "relevant" : ""} ${checkResult ? `has-check ${checkResult.severity}` : ""} ${handledState ? `is-${handledState}` : ""}`}
                  key={theoryId}
                >
                  <Lightbulb size={15} aria-hidden />
                  <div className="check-item-content">
                    <div className="check-item-header">
                      <span className="check-item-id">{theoryId}</span>
                      <span className="check-item-name">{suggestion.theory.plainName}</span>
                      {suggestion.relevant && <span className="theory-relevance">相关</span>}
                      {checkResult && (
                        <span className={`rule-check-badge ${checkResult.severity}`}>
                          {getSeverityLabel(checkResult.severity)}
                        </span>
                      )}
                      {explanation && (
                        <span className={`llm-explanation-badge ${explanation.source}`}>
                          {explanation.loading ? "解释中" : explanation.source === "llm" ? "AI解释" : "本地解释"}
                        </span>
                      )}
                      {handledState && (
                        <span className={`suggestion-state-badge ${handledState}`}>
                          {handledState === "ignored" ? "已忽略" : "已处理"}
                        </span>
                      )}
                    </div>
                    <p className="check-item-message">{displayPlainExplanation}</p>
                    {checkResult && (
                      <div className="rule-check-result">
                        <strong>{checkResult.location}</strong>
                        <p>{checkResult.message}</p>
                        <div className="rule-rescue-options">
                          {rescueOptions.map((option) => (
                            <span key={option}>{option}</span>
                          ))}
                        </div>
                        <div className="suggestion-actions">
                          {handledState ? (
                            <button
                              type="button"
                              className="suggestion-action"
                              onClick={() => handleSetSuggestionState(checkResult.theoryId, null)}
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
                                  onClick={() => handleSetSuggestionState(checkResult.theoryId, "ignored")}
                                >
                                  <X size={13} aria-hidden />
                                  忽略
                                </button>
                              )}
                              <button
                                type="button"
                                className="suggestion-action primary"
                                onClick={() => handleSetSuggestionState(checkResult.theoryId, "resolved")}
                              >
                                <Check size={13} aria-hidden />
                                标记已处理
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="theory-reason">{suggestion.reason}</p>
                    <button
                      className="theory-expand-button"
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedTheoryId(expanded ? null : theoryId)}
                    >
                      {expanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                      理论解释
                    </button>
                    {expanded && (
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
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
