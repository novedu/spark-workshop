"use client";

import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Download,
  Gauge,
  GitBranch,
  PanelRight,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WandSparkles,
  Waves
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { buildProjectMarkdown, sanitizeMarkdownFilename } from "@/lib/export-markdown";
import { llmProvider } from "@/lib/llm";
import { createOutlineFromScheme, createProjectId } from "@/lib/outline-template";
import { localStore } from "@/lib/storage";
import { runTheoryChecks } from "@/lib/theory-checker";
import { OutlineEditor } from "./OutlineEditor";
import { TheoryCheckerPanel } from "./TheoryCheckerPanel";
import type { EmotionBeat, WorldScheme, Project, UserPreference, ProjectSnapshot, OutlineNode, SimilarSettingHint } from "@/types/product";

const beats: EmotionBeat[] = [
  { id: "b1", label: "黄金开局", chapterHint: "1", emotion: "悬疑", intensity: 4 },
  { id: "b2", label: "救猫咪时刻", chapterHint: "1-3", emotion: "温馨", intensity: 3 },
  { id: "b3", label: "金手指觉醒", chapterHint: "5-8", emotion: "爽", intensity: 5 },
  { id: "b4", label: "第一次重大挫折", chapterHint: "50-60", emotion: "虐", intensity: 4 },
  { id: "b5", label: "中期转折", chapterHint: "100-120", emotion: "爽虐交织", intensity: 5 }
];

const outlineKindLabels: Record<OutlineNode["kind"], string> = {
  world: "世界观",
  protagonist: "主角",
  antagonist: "反派",
  goldenFinger: "金手指",
  conflict: "冲突",
  act: "篇章",
  foreshadowing: "伏笔"
};

const riskLabels: Record<SimilarSettingHint["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};

interface CreativeWorkbenchProps {
  project?: Project | null;
  onBack: () => void;
  onProjectSaved?: (project: Project) => void;
}

export function CreativeWorkbench({ project, onBack, onProjectSaved }: CreativeWorkbenchProps) {
  const [seedText, setSeedText] = useState(project?.seedText || "");
  const [schemes, setSchemes] = useState<WorldScheme[]>(project ? [project.selectedScheme] : []);
  const [selectedScheme, setSelectedScheme] = useState<WorldScheme>(
    project?.selectedScheme || {
      id: "new",
      type: "preference",
      title: "未命名方案",
      tagline: "",
      coreConcept: "",
      powerSystem: "",
      conflictType: "",
      emotionCurve: ""
    }
  );
  const [coreConcept, setCoreConcept] = useState(project?.selectedScheme?.coreConcept || "");
  const [powerSystem, setPowerSystem] = useState(project?.selectedScheme?.powerSystem || "");
  const [conflictType, setConflictType] = useState(project?.selectedScheme?.conflictType || "");
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>(project?.outlineNodes || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(project?.outlineNodes?.[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [igniteError, setIgniteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [preference, setPreference] = useState<UserPreference | null>(null);

  useEffect(() => {
    loadPreference();
  }, []);

  const loadPreference = async () => {
    try {
      const pref = await localStore.getPreference();
      if (pref) {
        setPreference(pref);
      }
    } catch (err) {
      console.warn("Failed to load preference:", err);
    }
  };

  const outlineNavigationNodes = useMemo(
    () => [...outlineNodes].sort((a, b) => a.order - b.order),
    [outlineNodes]
  );

  const getOutlineNodeSummary = (node: OutlineNode) => {
    const chapterRange = node.metadata?.chapterRange;
    if (typeof chapterRange === "string" && chapterRange.trim()) {
      return `${outlineKindLabels[node.kind]} · ${chapterRange}章`;
    }

    const contentPreview = node.content.trim();
    if (contentPreview) {
      return contentPreview.length > 22 ? `${contentPreview.slice(0, 22)}...` : contentPreview;
    }

    return `${outlineKindLabels[node.kind]} · 待补充`;
  };

  const applySchemeToOutline = (scheme: WorldScheme) => {
    setSelectedScheme(scheme);
    setCoreConcept(scheme.coreConcept || "");
    setPowerSystem(scheme.powerSystem || "");
    setConflictType(scheme.conflictType || "");
    setOutlineNodes(createOutlineFromScheme(scheme));
    setSelectedNodeId("world");
  };

  const handleIgnite = async () => {
    if (!seedText.trim()) return;

    setLoading(true);
    setIgniteError(null);
    try {
      const result = await llmProvider.igniteSeed({
        seedText: seedText.trim(),
        userPreference: preference || {
          pacePreference: "medium",
          infoGapTolerance: "medium",
          emotionAmplitude: "medium",
          styleTendency: "balanced"
        }
      });
      setSchemes(result.schemes);
      if (result.schemes[0]) {
        applySchemeToOutline(result.schemes[0]);
      }
    } catch (err) {
      console.error("Ignition failed:", err);
      setIgniteError("引爆失败了，当前灵感没有丢。可以直接重试，或稍后再生成方案。");
    } finally {
      setLoading(false);
    }
  };

  const buildCurrentProjectData = (id?: string): Project => {
    const now = new Date().toISOString();
    const schemeData = {
      ...selectedScheme,
      coreConcept,
      powerSystem,
      conflictType
    };
    const nodesToExport = outlineNodes.length > 0 ? outlineNodes : createOutlineFromScheme(schemeData);

    return {
      id: id || project?.id || createProjectId(),
      title: selectedScheme.title || "未命名项目",
      seedText: seedText.trim(),
      selectedScheme: schemeData,
      outlineNodes: nodesToExport,
      theoryChecks: runTheoryChecks({ outlineNodes: nodesToExport }),
      similarSettingHints: selectedScheme.similarSettingHints || [],
      createdAt: project?.createdAt || now,
      updatedAt: now
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    setSaveError(null);

    const now = new Date().toISOString();
    const isNewProject = !project?.id;
    const projectData = buildCurrentProjectData();

    try {
      await localStore.saveProject(projectData);

      if (isNewProject) {
        const snapshot: ProjectSnapshot = {
          id: `snapshot-${Date.now()}`,
          projectId: projectData.id,
          createdAt: now,
          reason: "aiGenerate",
          data: projectData
        };
        await localStore.saveSnapshot(snapshot);
      }

      setSelectedScheme(projectData.selectedScheme);
      setOutlineNodes(projectData.outlineNodes);
      if (!selectedNodeId && projectData.outlineNodes[0]) {
        setSelectedNodeId(projectData.outlineNodes[0].id);
      }
      onProjectSaved?.(projectData);
      setSaveStatus("保存成功");
    } catch (err) {
      setSaveStatus("保存失败");
      setSaveError("保存失败，当前编辑内容仍在页面上。请重试保存。");
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleExportMarkdown = () => {
    setExportStatus(null);

    try {
      const projectData = buildCurrentProjectData();
      const markdown = buildProjectMarkdown(projectData);
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeMarkdownFilename(projectData.title)}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportStatus("导出成功");
    } catch (err) {
      console.error("Markdown export failed:", err);
      setExportStatus("导出失败");
    } finally {
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleManualSnapshot = async () => {
    setSnapshotStatus(null);
    setSaveError(null);

    const now = new Date().toISOString();
    const projectData = buildCurrentProjectData(project?.id);

    try {
      await localStore.saveProject(projectData);
      await localStore.saveSnapshot({
        id: `snapshot-${Date.now()}`,
        projectId: projectData.id,
        createdAt: now,
        reason: "manualSave",
        data: projectData
      });

      setSelectedScheme(projectData.selectedScheme);
      setOutlineNodes(projectData.outlineNodes);
      onProjectSaved?.(projectData);
      setSnapshotStatus("快照已保存");
    } catch (err) {
      console.error("Manual snapshot failed:", err);
      setSnapshotStatus("快照失败");
      setSaveError("快照保存失败，当前编辑内容仍在页面上。");
    } finally {
      setTimeout(() => setSnapshotStatus(null), 3000);
    }
  };

  const handleSchemeSelect = (scheme: WorldScheme) => {
    applySchemeToOutline(scheme);
  };

  const handleUpdateNode = (id: string, updates: Partial<OutlineNode>) => {
    setOutlineNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, ...updates } : node))
    );
  };

  const handleAddNode = (node: OutlineNode) => {
    setOutlineNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
  };

  const handleDeleteNode = (id: string) => {
    setOutlineNodes((prev) => prev.filter((node) => node.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const renderSimilarHintPill = (hint: SimilarSettingHint) => (
    <span className={`similar-hint-pill ${hint.riskLevel}`} key={`${hint.keyword}-${hint.riskLevel}`}>
      {riskLabels[hint.riskLevel]} · {hint.keyword}
    </span>
  );

  const renderSimilarHintCard = (hint: SimilarSettingHint) => (
    <article className={`similar-hint-card ${hint.riskLevel}`} key={`${hint.keyword}-${hint.possibleTitles.join(",")}`}>
      <div>
        <span>{riskLabels[hint.riskLevel]}</span>
        <strong>{hint.keyword}</strong>
      </div>
      <p>可能撞味：{hint.possibleTitles.join("、")}</p>
      <small>{hint.suggestion}</small>
    </article>
  );

  return (
    <main className="workbench-shell">
      <aside className="left-rail" aria-label="项目与大纲">
        <div className="brand-block">
          <button className="back-button" onClick={onBack} type="button">
            <ArrowLeft size={18} />
          </button>
          <div className="brand-mark">
            <Sparkles size={22} aria-hidden />
          </div>
          <div>
            <p className="eyebrow">AI创意工坊</p>
            <h1>灵光一闪</h1>
          </div>
        </div>

        <section className="rail-section">
          <div className="section-title">
            <GitBranch size={16} aria-hidden />
            <span>大纲骨架</span>
          </div>
          {outlineNavigationNodes.length > 0 ? (
            <ol className="outline-list">
              {outlineNavigationNodes.map((node, index) => (
                <li className={selectedNodeId === node.id ? "active" : ""} key={node.id}>
                  <button
                    type="button"
                    aria-current={selectedNodeId === node.id ? "true" : undefined}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <span className="outline-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="outline-copy">
                      <span>{node.title}</span>
                      <small>{getOutlineNodeSummary(node)}</small>
                    </span>
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="outline-empty">引爆灵感后，这里会出现完整节点导航。</p>
          )}
        </section>

        <section className="rail-section taste-panel">
          <div className="section-title">
            <Gauge size={16} aria-hidden />
            <span>味觉画像</span>
          </div>
          <div className="taste-grid">
            <span>{preference?.pacePreference || "中等"}节奏</span>
            <span>{preference?.infoGapTolerance || "中等"}信息差</span>
            <span>{preference?.emotionAmplitude || "中等"}情绪</span>
            <span>{preference?.styleTendency || "均衡"}风格</span>
          </div>
        </section>
      </aside>

      <section className="center-stage" aria-label="创意工作区">
        <header className="topbar">
          <div>
            <p className="eyebrow">种子模式</p>
            <h2>奇点引爆器</h2>
          </div>
          <div className="toolbar">
            <button
              className="icon-button"
              type="button"
              title="刷新方案"
              onClick={handleIgnite}
              disabled={loading || !seedText.trim()}
            >
              <RefreshCw size={18} className={loading ? "spinning" : ""} aria-hidden />
            </button>
            <button
              className="icon-button"
              type="button"
              title="保存项目"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={18} aria-hidden />
            </button>
            <button
              className="icon-button"
              type="button"
              title="保存快照"
              onClick={handleManualSnapshot}
              disabled={!seedText.trim() && outlineNodes.length === 0}
            >
              <Camera size={18} aria-hidden />
            </button>
            <button
              className="icon-button"
              type="button"
              title="导出 Markdown"
              onClick={handleExportMarkdown}
              disabled={!seedText.trim() && outlineNodes.length === 0}
            >
              <Download size={18} aria-hidden />
            </button>
            {saveStatus && (
              <span className={`save-status ${saveStatus === "保存成功" ? "success" : "error"}`}>
                {saveStatus}
              </span>
            )}
            {exportStatus && (
              <span className={`save-status ${exportStatus === "导出成功" ? "success" : "error"}`}>
                {exportStatus}
              </span>
            )}
            {snapshotStatus && (
              <span className={`save-status ${snapshotStatus === "快照已保存" ? "success" : "error"}`}>
                {snapshotStatus}
              </span>
            )}
          </div>
        </header>

        <div className="seed-composer">
          <textarea
            aria-label="灵感种子"
            value={seedText}
            maxLength={100}
            onChange={(event) => setSeedText(event.target.value)}
            placeholder="输入一句灵感，比如：长廊，触手，吞噬记忆"
          />
          <button className="primary-button" type="button" onClick={handleIgnite} disabled={loading || !seedText.trim()}>
            <WandSparkles size={18} className={loading ? "spinning" : ""} aria-hidden />
            {loading ? "引爆中..." : "引爆"}
          </button>
        </div>

        {igniteError && (
          <div className="recoverable-alert error">
            <p>{igniteError}</p>
            <button className="secondary-button" type="button" onClick={handleIgnite} disabled={loading || !seedText.trim()}>
              <RefreshCw size={16} className={loading ? "spinning" : ""} aria-hidden />
              重试引爆
            </button>
          </div>
        )}

        {saveError && (
          <div className="recoverable-alert error">
            <p>{saveError}</p>
            <button className="secondary-button" type="button" onClick={handleSave} disabled={saving}>
              <Save size={16} aria-hidden />
              重试保存
            </button>
          </div>
        )}

        {schemes.length > 0 && (
          <div className="scheme-grid">
            {schemes.map((scheme) => (
              <button
                className={`scheme-card ${selectedScheme.id === scheme.id ? "selected" : ""}`}
                key={scheme.id}
                type="button"
                onClick={() => handleSchemeSelect(scheme)}
              >
                <div className="scheme-heading">
                  <span>
                    {scheme.type === "preference" ? "偏好" : scheme.type === "contrast" ? "反差" : "脑洞"}
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </div>
                <h3>{scheme.title}</h3>
                <p>{scheme.tagline}</p>
                {scheme.similarSettingHints && scheme.similarSettingHints.length > 0 && (
                  <div className="scheme-similar-hints" aria-label="相似设定提示">
                    {scheme.similarSettingHints.slice(0, 2).map(renderSimilarHintPill)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedScheme.similarSettingHints && selectedScheme.similarSettingHints.length > 0 && (
          <section className="similar-hints-panel" aria-label="本地相似设定提示">
            <div className="section-title">
              <TriangleAlert size={16} aria-hidden />
              <span>相似设定提示</span>
            </div>
            <div className="similar-hints-list">
              {selectedScheme.similarSettingHints.map(renderSimilarHintCard)}
            </div>
          </section>
        )}

        {outlineNodes.length > 0 ? (
          <OutlineEditor
            nodes={outlineNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateNode={handleUpdateNode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
          />
        ) : (
          <article className="editor-surface editor-empty-state">
            <div>
              <p className="eyebrow">架构模式</p>
              <h2>等待灵感引爆</h2>
            </div>
            <p>输入一句灵感并选择一个方案后，这里会生成完整大纲节点。</p>
          </article>
        )}
      </section>

      <aside className="right-panel" aria-label="AI助手面板">
        <div className="panel-header">
          <div>
            <p className="eyebrow">AI助手</p>
            <h2>理论引擎</h2>
          </div>
          <PanelRight size={20} aria-hidden />
        </div>

        <section className="theory-panel">
          <TheoryCheckerPanel
            nodes={outlineNodes}
            selectedNodeId={selectedNodeId}
          />
        </section>

        <section className="emotion-panel">
          <div className="section-title">
            <Waves size={16} aria-hidden />
            <span>情绪节拍器</span>
          </div>
          <div className="beat-chart">
            {beats.map((beat) => (
              <div className="beat" key={beat.id}>
                <div className="beat-bar" style={{ height: `${beat.intensity * 18}px` }} />
                <small>{beat.chapterHint}</small>
              </div>
            ))}
          </div>
          <div className="guardrail">
            <ShieldCheck size={16} aria-hidden />
            <span>避坑清单已挂载到生成约束</span>
          </div>
        </section>
      </aside>
    </main>
  );
}
