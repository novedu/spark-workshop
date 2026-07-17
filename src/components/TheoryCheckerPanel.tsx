"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, XCircle, ChevronRight, Lightbulb, BookOpen, Brain } from "lucide-react";
import type { Project } from "@/types/product";
import type { TheoryCheckWithExplanation } from "@/lib/theory-checker";
import { runTheoryChecksWithExplanations, getSeverityColor, getSeverityLabel } from "@/lib/theory-checker";

interface TheoryCheckerPanelProps {
  project: Project | null;
  selectedNodeId: string | null;
}

const severityIcons = {
  pass: CheckCircle,
  warning: AlertCircle,
  fail: XCircle
};

export function TheoryCheckerPanel({ project, selectedNodeId }: TheoryCheckerPanelProps) {
  const [checkResults, setCheckResults] = useState<TheoryCheckWithExplanation[]>([]);
  const [selectedResult, setSelectedResult] = useState<TheoryCheckWithExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project && project.outlineNodes.length > 0) {
      runChecks();
    }
  }, [project, selectedNodeId]);

  const runChecks = async () => {
    setLoading(true);
    try {
      const results = await runTheoryChecksWithExplanations(project!);
      setCheckResults(results);
      if (results.length > 0 && !selectedResult) {
        setSelectedResult(results[0]);
      }
    } catch (err) {
      console.error("Theory check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const warningCount = checkResults.filter((r) => r.severity === "warning").length;
  const failCount = checkResults.filter((r) => r.severity === "fail").length;

  return (
    <div className="theory-checker-panel">
      <div className="checker-header">
        <div className="checker-title">
          <Brain size={16} />
          <span>理论检测</span>
        </div>
        <div className="checker-status">
          {loading ? (
            <span className="loading-text">检测中...</span>
          ) : (
            <span className={`status-summary ${failCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success"}`}>
              {failCount > 0 ? `${failCount} 个问题` : warningCount > 0 ? `${warningCount} 个警告` : "全部通过"}
            </span>
          )}
        </div>
      </div>

      <div className="checker-content">
        <div className="check-results-list">
          {loading ? (
            <div className="loading-indicator">
              <div className="spinner" />
              <span>正在分析大纲...</span>
            </div>
          ) : checkResults.length === 0 ? (
            <div className="empty-results">
              <CheckCircle size={32} className="success-icon" />
              <p>所有理论检测通过</p>
              <small>你的大纲结构完整，继续保持！</small>
            </div>
          ) : (
            <div className="results-list">
              {checkResults.map((result) => {
                const Icon = severityIcons[result.severity];
                return (
                  <div
                    key={result.theoryId}
                    className={`check-item ${result.severity} ${selectedResult?.theoryId === result.theoryId ? "selected" : ""}`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <Icon size={14} style={{ color: getSeverityColor(result.severity) }} />
                    <div className="check-item-content">
                      <div className="check-item-header">
                        <span className="check-item-id">{result.theoryId}</span>
                        <span className="check-item-name">{result.theory.plainName}</span>
                      </div>
                      <p className="check-item-message">{result.message}</p>
                    </div>
                    <ChevronRight size={14} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedResult && (
          <div className="check-detail-panel">
            <div className="detail-header">
              <div className="detail-title">
                <span className="detail-id">{selectedResult.theoryId}</span>
                <span className="detail-academic">{selectedResult.theory.academicName}</span>
              </div>
              <span className={`detail-badge ${selectedResult.severity}`}>
                {getSeverityLabel(selectedResult.severity)}
              </span>
            </div>

            <div className="detail-section">
              <div className="section-icon">
                <BookOpen size={16} />
              </div>
              <div>
                <h4>理论解释</h4>
                <p className="theory-explanation">{selectedResult.theory.coreIdea}</p>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-icon">
                <AlertCircle size={16} />
              </div>
              <div>
                <h4>问题描述</h4>
                <p className="plain-explanation">{selectedResult.plainExplanation}</p>
              </div>
            </div>

            <div className="detail-section suggestions-section">
              <div className="section-icon">
                <Lightbulb size={16} />
              </div>
              <div>
                <h4>修改建议</h4>
                <ul className="suggestions-list">
                  {selectedResult.suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <span className="suggestion-number">{index + 1}</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="detail-footer">
              {selectedResult.canIgnore ? (
                <span className="can-ignore">可忽略此建议</span>
              ) : (
                <span className="must-fix">建议必须修改</span>
              )}
              <span className="location-hint">位置：{selectedResult.location}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}