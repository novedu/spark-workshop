"use client";

import { CheckCircle2, ListChecks, TriangleAlert } from "lucide-react";
import { runQualityChecks, type QualityCheckResult } from "@/lib/quality-checker";
import type { OutlineNode } from "@/types/product";

interface QualityChecklistPanelProps {
  nodes: OutlineNode[];
}

const severityLabels: Record<QualityCheckResult["severity"], string> = {
  pass: "稳",
  warning: "待补",
  fail: "先补"
};

export function QualityChecklistPanel({ nodes }: QualityChecklistPanelProps) {
  const results = runQualityChecks({ outlineNodes: nodes });
  const failCount = results.filter((result) => result.severity === "fail").length;
  const warningCount = results.filter((result) => result.severity === "warning").length;
  const statusClass = failCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success";
  const statusText = failCount > 0 ? `${failCount} 项先补` : warningCount > 0 ? `${warningCount} 项待补` : "体感顺";

  return (
    <div className="quality-checklist-panel">
      <div className="quality-header">
        <div>
          <div className="quality-title">
            <ListChecks size={16} aria-hidden />
            <span>网文质检</span>
          </div>
          <p>本地清单检查开头、章末、场景和连载承接。</p>
        </div>
        <span className={`status-summary ${statusClass}`}>{statusText}</span>
      </div>

      <div className="quality-list">
        {results.map((result) => (
          <article className={`quality-item ${result.severity}`} key={result.id}>
            <div className="quality-item-icon" aria-hidden>
              {result.severity === "pass" ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />}
            </div>
            <div className="quality-item-content">
              <div className="quality-item-head">
                <strong>{result.title}</strong>
                <span>{severityLabels[result.severity]}</span>
              </div>
              <small>{result.location}</small>
              <p>{result.message}</p>
              <div className="quality-suggestions">
                {result.suggestions.slice(0, 3).map((suggestion) => (
                  <span key={suggestion}>{suggestion}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
