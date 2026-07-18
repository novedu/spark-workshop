"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, FileText, ListChecks, TriangleAlert } from "lucide-react";
import { evaluateTheorySample, theoryEvalSamples } from "@/lib/theory-eval-samples";
import type { OutlineNode, TheorySuggestionState } from "@/types/product";
import { TheoryCheckerPanel } from "./TheoryCheckerPanel";

interface TheoryEvalWorkbenchProps {
  onBack: () => void;
}

const getNodeSummary = (node: OutlineNode) => {
  const content = node.content.trim();
  if (!content) return "空节点";
  return content.length > 46 ? `${content.slice(0, 46)}...` : content;
};

export function TheoryEvalWorkbench({ onBack }: TheoryEvalWorkbenchProps) {
  const [selectedSampleId, setSelectedSampleId] = useState(theoryEvalSamples[0]?.id ?? "");
  const selectedSample = theoryEvalSamples.find((sample) => sample.id === selectedSampleId) ?? theoryEvalSamples[0];
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectedSample?.selectedNodeId ?? null);
  const [theorySuggestionStates, setTheorySuggestionStates] = useState<Record<string, TheorySuggestionState>>({});
  const evalResult = useMemo(
    () => (selectedSample ? evaluateTheorySample(selectedSample) : null),
    [selectedSample]
  );

  useEffect(() => {
    setSelectedNodeId(selectedSample?.selectedNodeId ?? null);
    setTheorySuggestionStates({});
  }, [selectedSample?.id, selectedSample?.selectedNodeId]);

  if (!selectedSample || !evalResult) {
    return (
      <main className="theory-eval-shell">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          返回
        </button>
      </main>
    );
  }

  return (
    <main className="theory-eval-shell">
      <header className="theory-eval-header">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          返回项目
        </button>
        <div>
          <p className="eyebrow">RuleMatch-5</p>
          <h1>理论诊断样例验收</h1>
        </div>
        <span className={`eval-result-pill ${evalResult.passed ? "pass" : "fail"}`}>
          {evalResult.passed ? <CheckCircle2 size={15} aria-hidden /> : <TriangleAlert size={15} aria-hidden />}
          {evalResult.passed ? "样例通过" : "需要复核"}
        </span>
      </header>

      <section className="theory-eval-layout">
        <aside className="theory-eval-samples" aria-label="理论样例">
          <div className="eval-panel-title">
            <ClipboardCheck size={16} aria-hidden />
            <span>样例</span>
          </div>
          {theoryEvalSamples.map((sample) => {
            const result = evaluateTheorySample(sample);
            const selected = sample.id === selectedSample.id;
            return (
              <button
                type="button"
                className={`eval-sample-card ${selected ? "selected" : ""}`}
                key={sample.id}
                onClick={() => setSelectedSampleId(sample.id)}
              >
                <span>{sample.title}</span>
                <small>{sample.oldReaderNote}</small>
                <em>{result.passed ? "通过" : "复核"}</em>
              </button>
            );
          })}
        </aside>

        <section className="theory-eval-stage" aria-label="样例大纲">
          <article className="eval-sample-summary">
            <div>
              <p className="eyebrow">老书虫视角</p>
              <h2>{selectedSample.title}</h2>
            </div>
            <p>{selectedSample.oldReaderNote}</p>
            <small>{selectedSample.creatorRisk}</small>
            <div className="eval-chip-row">
              <span>命中：{evalResult.checkIds.join("、") || "无"}</span>
              <span>置顶：{evalResult.needsFixIds.join("、") || "无"}</span>
            </div>
          </article>

          <div className="eval-node-list">
            {selectedSample.outlineNodes.map((node) => (
              <button
                type="button"
                className={`eval-node-row ${selectedNodeId === node.id ? "selected" : ""}`}
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <FileText size={14} aria-hidden />
                <span>{node.title}</span>
                <small>{getNodeSummary(node)}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="theory-eval-diagnosis" aria-label="诊断面板样例态">
          <div className="eval-panel-title">
            <ListChecks size={16} aria-hidden />
            <span>面板态</span>
          </div>
          <TheoryCheckerPanel
            key={selectedSample.id}
            nodes={selectedSample.outlineNodes}
            selectedNodeId={selectedNodeId}
            theorySuggestionStates={theorySuggestionStates}
            onTheorySuggestionStatesChange={setTheorySuggestionStates}
          />
        </aside>
      </section>
    </main>
  );
}
