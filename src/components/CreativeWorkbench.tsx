"use client";

import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Clock,
  Download,
  Gauge,
  GitBranch,
  PanelRight,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
  Waves
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { buildProjectMarkdown, sanitizeMarkdownFilename } from "@/lib/export-markdown";
import { shouldConfirmAiOperation } from "@/lib/ai-usage-settings";
import { getAiRecoveryCopy } from "@/lib/ai-recovery-copy";
import { getNodeEmotionGoal } from "@/lib/emotion-goals";
import { llmProvider } from "@/lib/llm";
import { createOutlineFromScheme, createProjectId, ensureSerialArcNodes } from "@/lib/outline-template";
import { getOutlineNodeDisplayTitle, groupOutlineNodes, outlineKindDisplayLabels } from "@/lib/outline-ux";
import { buildSchemeTheoryDiagnostics } from "@/lib/scheme-theory-diagnostics";
import { localStore } from "@/lib/storage";
import { llmSourceCopy } from "@/lib/status-copy";
import { runTheoryChecks } from "@/lib/theory-checker";
import { OutlineEditor } from "./OutlineEditor";
import { QualityChecklistPanel } from "./QualityChecklistPanel";
import { TheoryCheckerPanel } from "./TheoryCheckerPanel";
import type {
  WorldScheme,
  Project,
  UserPreference,
  ProjectSnapshot,
  OutlineNode,
  SimilarSettingHint,
  TheorySuggestionState
} from "@/types/product";
import type { LlmResultMeta } from "@/types/product";

const riskLabels: Record<SimilarSettingHint["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};

const snapshotReasonLabels: Record<ProjectSnapshot["reason"], string> = {
  manualSave: "手动保存",
  aiGenerate: "初始生成",
  theoryFix: "理论修复"
};

const pacePreferenceLabels: Record<string, string> = {
  fast: "快节奏",
  medium: "中等节奏",
  slow: "慢节奏"
};

const infoGapLabels: Record<string, string> = {
  high: "高信息差",
  medium: "中等信息差",
  low: "低信息差"
};

const emotionAmplitudeLabels: Record<string, string> = {
  high: "高情绪",
  medium: "中等情绪",
  low: "低情绪"
};

const styleTendencyLabels: Record<string, string> = {
  qidian: "起点风",
  feilu: "飞卢风",
  jinjiang: "晋江风",
  balanced: "均衡风格"
};

interface CreativeWorkbenchProps {
  project?: Project | null;
  onBack: () => void;
  onProjectSaved?: (project: Project) => void;
}

export function CreativeWorkbench({ project, onBack, onProjectSaved }: CreativeWorkbenchProps) {
  const draftProjectIdRef = useRef(project?.id || createProjectId());
  const draftCreatedAtRef = useRef(project?.createdAt || new Date().toISOString());
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
  const initialOutlineNodes = project?.outlineNodes ? ensureSerialArcNodes(project.outlineNodes) : [];
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>(initialOutlineNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialOutlineNodes[0]?.id || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [igniteError, setIgniteError] = useState<string | null>(null);
  const [igniteMeta, setIgniteMeta] = useState<LlmResultMeta | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [enhancingNodeId, setEnhancingNodeId] = useState<string | null>(null);
  const [enhanceStatus, setEnhanceStatus] = useState<string | null>(null);
  const [theorySuggestionStates, setTheorySuggestionStates] = useState<Record<string, TheorySuggestionState>>(
    project?.theorySuggestionStates || {}
  );

  useEffect(() => {
    loadPreference();
  }, []);

  useEffect(() => {
    void loadSnapshots(project?.id || draftProjectIdRef.current);
  }, [project?.id]);

  useEffect(() => {
    if (project?.id) {
      draftProjectIdRef.current = project.id;
      draftCreatedAtRef.current = project.createdAt;
      setTheorySuggestionStates(project.theorySuggestionStates || {});
    }
  }, [project?.id, project?.createdAt]);

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

  const loadSnapshots = async (projectId: string) => {
    setSnapshotLoading(true);
    try {
      const result = await localStore.listSnapshots(projectId);
      setSnapshots(result);
    } catch (err) {
      console.warn("Failed to load snapshots:", err);
      setSnapshotStatus("快照读取失败");
    } finally {
      setSnapshotLoading(false);
    }
  };

  const outlineNavigationNodes = useMemo(
    () => [...outlineNodes].sort((a, b) => a.order - b.order),
    [outlineNodes]
  );
  const outlineNavigationGroups = useMemo(
    () => groupOutlineNodes(outlineNavigationNodes),
    [outlineNavigationNodes]
  );
  const outlineNavigationOrder = useMemo(
    () => new Map(outlineNavigationNodes.map((node, index) => [node.id, index + 1])),
    [outlineNavigationNodes]
  );
  const emotionBeats = useMemo(
    () =>
      outlineNavigationNodes.map((node) => ({
        node,
        goal: getNodeEmotionGoal(node)
      })),
    [outlineNavigationNodes]
  );
  const selectedEmotionBeat = emotionBeats.find((beat) => beat.node.id === selectedNodeId) ?? emotionBeats[0];
  const schemeDiagnostics = useMemo(() => buildSchemeTheoryDiagnostics(schemes), [schemes]);
  const selectedSchemeDiagnostic = schemeDiagnostics.find((diagnostic) => diagnostic.schemeId === selectedScheme.id);
  const hasProjectContent = seedText.trim().length > 0 || outlineNodes.length > 0;
  const aiSourceText = igniteMeta ? llmSourceCopy[igniteMeta.source].label : "AI 待调用";
  const aiSourceTone = igniteMeta?.source ?? "idle";
  const projectStatusText = project?.id ? "本地项目已建立" : hasProjectContent ? "新草稿，待保存" : "空白草稿";
  const theoryStatusText = outlineNodes.length > 0 ? "理论检测：本地规则" : "理论检测：待大纲";
  const snapshotStatusIsError = snapshotStatus?.includes("失败") || snapshotStatus?.includes("读取");

  const getOutlineNodeSummary = (node: OutlineNode) => {
    const chapterRange = node.metadata?.chapterRange;
    if (typeof chapterRange === "string" && chapterRange.trim()) {
      return `${outlineKindDisplayLabels[node.kind]} · ${chapterRange}章`;
    }

    const contentPreview = node.content.trim();
    if (contentPreview) {
      return contentPreview.length > 22 ? `${contentPreview.slice(0, 22)}...` : contentPreview;
    }

    return `${outlineKindDisplayLabels[node.kind]} · 待补充`;
  };

  const formatSnapshotTime = (dateString: string) =>
    new Date(dateString).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

  const getSnapshotSummary = (snapshot: ProjectSnapshot) => {
    const nodeCount = snapshot.data.outlineNodes?.length || 0;
    return `${snapshotReasonLabels[snapshot.reason]} · ${nodeCount} 个节点`;
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
    if (
      shouldConfirmAiOperation() &&
      !window.confirm("灵感引爆会调用真实 AI，可能等待较久并消耗 token。继续吗？")
    ) {
      return;
    }

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
      setIgniteMeta(result.llmMeta ?? { source: "mock", fallbackReason: "未返回 LLM 来源信息。" });
      setSchemes(result.schemes);
      if (result.schemes[0]) {
        applySchemeToOutline(result.schemes[0]);
      }
    } catch (err) {
      console.error("Ignition failed:", err);
      setIgniteError(getAiRecoveryCopy(err, "灵感引爆").message);
    } finally {
      setLoading(false);
    }
  };

  const buildCurrentProjectData = (id?: string, outlineNodeOverride?: OutlineNode[]): Project => {
    const now = new Date().toISOString();
    const schemeData = {
      ...selectedScheme,
      coreConcept,
      powerSystem,
      conflictType
    };
    const sourceNodes = ensureSerialArcNodes(outlineNodeOverride ?? outlineNodes);
    const nodesToExport = sourceNodes.length > 0 ? sourceNodes : createOutlineFromScheme(schemeData);

    return {
      id: id || project?.id || draftProjectIdRef.current,
      title: selectedScheme.title || "未命名项目",
      seedText: seedText.trim(),
      selectedScheme: schemeData,
      outlineNodes: nodesToExport,
      theoryChecks: runTheoryChecks({ outlineNodes: nodesToExport }),
      theorySuggestionStates,
      similarSettingHints: selectedScheme.similarSettingHints || [],
      createdAt: project?.createdAt || draftCreatedAtRef.current,
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

      await loadSnapshots(projectData.id);
      setSelectedScheme(projectData.selectedScheme);
      setOutlineNodes(ensureSerialArcNodes(projectData.outlineNodes));
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

      await loadSnapshots(projectData.id);
      setSelectedScheme(projectData.selectedScheme);
      setOutlineNodes(ensureSerialArcNodes(projectData.outlineNodes));
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

  const handleRestoreSnapshot = (snapshot: ProjectSnapshot) => {
    if (!window.confirm("将这个快照载入编辑区吗？载入后需要点击保存项目，才会覆盖当前项目。")) {
      return;
    }

    const projectData = snapshot.data;
    setSeedText(projectData.seedText);
    setSchemes([projectData.selectedScheme]);
    setSelectedScheme(projectData.selectedScheme);
    setCoreConcept(projectData.selectedScheme.coreConcept || "");
    setPowerSystem(projectData.selectedScheme.powerSystem || "");
    setConflictType(projectData.selectedScheme.conflictType || "");
    const restoredOutlineNodes = ensureSerialArcNodes(projectData.outlineNodes || []);
    setOutlineNodes(restoredOutlineNodes);
    setSelectedNodeId(restoredOutlineNodes[0]?.id || null);
    setTheorySuggestionStates(projectData.theorySuggestionStates || {});
    setSaveError(null);
    setSnapshotStatus("已载入快照，保存后覆盖当前项目");
    setTimeout(() => setSnapshotStatus(null), 3600);
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!window.confirm("确定删除这个快照吗？当前项目内容不会受影响。")) {
      return;
    }

    try {
      await localStore.deleteSnapshot(snapshotId);
      await loadSnapshots(project?.id || draftProjectIdRef.current);
      setSnapshotStatus("快照已删除");
    } catch (err) {
      console.error("Delete snapshot failed:", err);
      setSnapshotStatus("快照删除失败");
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

  const handleEnhanceNode = async (id: string) => {
    const node = outlineNodes.find((item) => item.id === id);
    if (!node || enhancingNodeId) return;
    if (
      shouldConfirmAiOperation() &&
      !window.confirm("AI补全会调用真实 AI，可能等待较久并消耗 token。继续吗？")
    ) {
      return;
    }

    setEnhancingNodeId(id);
    setEnhanceStatus("AI 正在补全当前节点...");

    try {
      const result = await llmProvider.enhanceOutlineNode({
        node,
        outlineNodes
      });
      const currentContent = node.content.trim();
      const nextContent = currentContent
        ? `${currentContent}\n\n【AI补充】\n${result.content}`
        : result.content;
      const nextOutlineNodes = outlineNodes.map((item) =>
        item.id === id ? { ...item, content: nextContent } : item
      );

      setOutlineNodes(nextOutlineNodes);
      const projectData = buildCurrentProjectData(project?.id, nextOutlineNodes);
      try {
        await localStore.saveProject(projectData);
        onProjectSaved?.(projectData);
      } catch (saveError) {
        console.error("Enhance outline node auto-save failed:", saveError);
        setSaveError("AI补全已写入当前页面，但自动保存失败。请点击保存项目重试。");
        setEnhanceStatus("AI补全完成，但自动保存失败");
        return;
      }

      if (result.llmMeta?.source === "mock" && result.llmMeta.fallbackReason?.includes("超时")) {
        setEnhanceStatus("真实 AI 超时，已用本地兜底补全并保存");
        return;
      }

      setEnhanceStatus(
        result.llmMeta?.source === "llm"
          ? "AI补全完成，已保存"
          : result.llmMeta?.source === "cache"
            ? "已使用缓存补全，已保存"
            : "已使用本地兜底补全，已保存"
      );
    } catch (error) {
      console.error("Enhance outline node failed:", error);
      setEnhanceStatus(getAiRecoveryCopy(error, "AI补全").message);
    } finally {
      setEnhancingNodeId(null);
      setTimeout(() => setEnhanceStatus(null), 3500);
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
            <div className="outline-group-list">
              {outlineNavigationGroups.map((group) => (
                <section className="outline-nav-group" key={group.id}>
                  <div className="outline-nav-group-title">
                    <strong>{group.title}</strong>
                    <small>{group.hint}</small>
                  </div>
                  <ol className="outline-list">
                    {group.nodes.map((node) => (
                      <li
                        className={[
                          selectedNodeId === node.id ? "active" : "",
                          node.kind === "arcPhase" ? "child-phase" : ""
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={node.id}
                      >
                        <button
                          type="button"
                          aria-current={selectedNodeId === node.id ? "true" : undefined}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          <span className="outline-index">
                            {String(outlineNavigationOrder.get(node.id) ?? node.order + 1).padStart(2, "0")}
                          </span>
                          <span className="outline-copy">
                            <span>{getOutlineNodeDisplayTitle(node)}</span>
                            <small>{getOutlineNodeSummary(node)}</small>
                          </span>
                          <ChevronRight size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
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
            <span>{pacePreferenceLabels[preference?.pacePreference ?? "medium"] ?? "中等节奏"}</span>
            <span>{infoGapLabels[preference?.infoGapTolerance ?? "medium"] ?? "中等信息差"}</span>
            <span>{emotionAmplitudeLabels[preference?.emotionAmplitude ?? "medium"] ?? "中等情绪"}</span>
            <span>{styleTendencyLabels[preference?.styleTendency ?? "balanced"] ?? "均衡风格"}</span>
          </div>
        </section>

        <section className="rail-section snapshot-panel" aria-label="项目快照">
          <div className="section-title snapshot-title">
            <span>
              <Camera size={16} aria-hidden />
              项目快照
            </span>
            <button
              className="mini-icon-button"
              type="button"
              title="刷新快照列表"
              onClick={() => loadSnapshots(project?.id || draftProjectIdRef.current)}
              disabled={snapshotLoading}
            >
              <RefreshCw size={14} className={snapshotLoading ? "spinning" : ""} aria-hidden />
            </button>
          </div>
          {snapshotLoading ? (
            <p className="outline-empty">读取快照中...</p>
          ) : snapshots.length > 0 ? (
            <div className="snapshot-list">
              {snapshots.slice(0, 5).map((snapshot) => (
                <article className="snapshot-item" key={snapshot.id}>
                  <div className="snapshot-copy">
                    <strong>{snapshot.data.title || "未命名项目"}</strong>
                    <small>
                      <Clock size={12} aria-hidden />
                      {formatSnapshotTime(snapshot.createdAt)}
                    </small>
                    <span>{getSnapshotSummary(snapshot)}</span>
                  </div>
                  <div className="snapshot-actions">
                    <button
                      className="mini-action-button"
                      type="button"
                      title="恢复快照到编辑区"
                      onClick={() => handleRestoreSnapshot(snapshot)}
                    >
                      <RotateCcw size={12} aria-hidden />
                      恢复
                    </button>
                    <button
                      className="mini-icon-button danger"
                      type="button"
                      title="删除快照"
                      onClick={() => handleDeleteSnapshot(snapshot.id)}
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  </div>
                </article>
              ))}
              {snapshots.length > 5 && <p className="snapshot-note">仅显示最近 5 个，共 {snapshots.length} 个。</p>}
            </div>
          ) : (
            <p className="outline-empty">保存项目或点击保存快照后，会在这里找到最近版本。</p>
          )}
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
                保存 · {saveStatus}
              </span>
            )}
            {exportStatus && (
              <span className={`save-status ${exportStatus === "导出成功" ? "success" : "error"}`}>
                导出 · {exportStatus}
              </span>
            )}
            {snapshotStatus && (
              <span className={`save-status ${snapshotStatusIsError ? "error" : "success"}`}>
                快照 · {snapshotStatus}
              </span>
            )}
          </div>
        </header>

        <section className="creative-control-panel" aria-label="灵感引爆控制台">
          <div className="workbench-status-strip" aria-label="工作台状态">
            <span>{projectStatusText}</span>
            <span className={`source-${aiSourceTone}`}>{aiSourceText}</span>
            <span>{theoryStatusText}</span>
          </div>

          <div className="seed-composer">
            <div className="seed-input-stack">
              <textarea
                aria-label="灵感种子"
                value={seedText}
                maxLength={240}
                onChange={(event) => setSeedText(event.target.value)}
                placeholder="一个词、一个意象或一句设定都可以，比如：记忆 / 脑内 AI / 无限 token"
              />
              <div className="seed-composer-meta">
                <p className="seed-composer-hint">
                  可以只写小点子；AI 会先补出主角、规则、代价和冲突，再引爆成 3 个方向。
                </p>
                <span>{seedText.length}/240</span>
              </div>
            </div>
            <div className="seed-action-stack">
              <button
                className="primary-button seed-submit-button"
                type="button"
                onClick={handleIgnite}
                disabled={loading || !seedText.trim()}
              >
                <WandSparkles size={18} className={loading ? "spinning" : ""} aria-hidden />
                {loading ? "引爆中..." : "引爆"}
              </button>
              <small>生成 3 个方向</small>
            </div>
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

          {igniteMeta && (
            <div className={`llm-source-alert ${igniteMeta.source}`}>
              <div className="llm-source-heading">
                <Sparkles size={14} aria-hidden />
                <span>
                  {igniteMeta.source === "llm"
                    ? `已使用${llmSourceCopy.llm.label}生成`
                    : igniteMeta.source === "cache"
                      ? `已使用${llmSourceCopy.cache.label}`
                      : "真实 AI 暂不可用，已用本地兜底"}
                </span>
              </div>
              {igniteMeta.fallbackReason && <p>原因：{igniteMeta.fallbackReason}</p>}
            </div>
          )}
        </section>

        {saveError && (
          <div className="recoverable-alert error">
            <p>{saveError}</p>
            <button className="secondary-button" type="button" onClick={handleSave} disabled={saving}>
              <Save size={16} aria-hidden />
              重试保存
            </button>
          </div>
        )}

        {schemes.length > 1 && (
          <>
            <div className="scheme-grid">
              {schemes.map((scheme) => {
                const diagnostic = schemeDiagnostics.find((item) => item.schemeId === scheme.id);
                const topRisk = diagnostic?.risks[0];

                return (
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
                    {(scheme.storyHook || scheme.premise || scheme.storyEngine) && (
                      <div className="scheme-engine-fields" aria-label="故事引擎字段">
                        {scheme.storyHook && (
                          <span>
                            <strong>钩子</strong>
                            {scheme.storyHook}
                          </span>
                        )}
                        {scheme.premise && (
                          <span>
                            <strong>Premise</strong>
                            {scheme.premise}
                          </span>
                        )}
                        {scheme.storyEngine && (
                          <span>
                            <strong>引擎</strong>
                            {scheme.storyEngine}
                          </span>
                        )}
                      </div>
                    )}
                    {diagnostic && (
                      <div className="scheme-theory-brief" aria-label="方案理论诊断">
                        <span className={`scheme-score ${diagnostic.tone}`}>
                          {diagnostic.verdict} · {diagnostic.score}
                        </span>
                        <small>{diagnostic.differenceSummary}</small>
                        {topRisk && (
                          <em>
                            先补 {topRisk.label}
                            {topRisk.theoryId ? ` · ${topRisk.theoryId}` : ""}
                          </em>
                        )}
                      </div>
                    )}
                    {scheme.similarSettingHints && scheme.similarSettingHints.length > 0 && (
                      <div className="scheme-similar-hints" aria-label="相似设定提示">
                        {scheme.similarSettingHints.slice(0, 2).map(renderSimilarHintPill)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <section className="scheme-compare-panel" aria-label="方案差异速读">
              <div className="section-title">
                <Search size={16} aria-hidden />
                <span>方案差异速读</span>
              </div>
              <div className="scheme-compare-grid">
                {schemes.map((scheme) => {
                  const diagnostic = schemeDiagnostics.find((item) => item.schemeId === scheme.id);
                  if (!diagnostic) return null;
                  const selected = selectedScheme.id === scheme.id;

                  return (
                    <article className={`scheme-compare-item ${diagnostic.tone} ${selected ? "selected" : ""}`} key={scheme.id}>
                      <div className="scheme-compare-head">
                        <span>{scheme.title}</span>
                        <strong>{diagnostic.verdict}</strong>
                      </div>
                      <p>{diagnostic.differenceSummary}</p>
                      <div className="scheme-compare-points">
                        {diagnostic.strengths.slice(0, 2).map((strength) => (
                          <span className="strength" key={strength}>
                            {strength}
                          </span>
                        ))}
                        {diagnostic.risks.slice(0, 2).map((risk) => (
                          <span className="risk" key={`${risk.label}-${risk.message}`}>
                            {risk.label}待补
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
              {selectedSchemeDiagnostic && selectedSchemeDiagnostic.risks.length > 0 && (
                <div className="selected-scheme-risks">
                  <strong>当前方案优先补</strong>
                  <div>
                    {selectedSchemeDiagnostic.risks.slice(0, 3).map((risk) => (
                      <span key={`${risk.label}-${risk.fixHint}`}>
                        {risk.label}：{risk.fixHint}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {schemes.length === 1 && (
          <section className="selected-scheme-panel" aria-label="已选方案">
            <div className="selected-scheme-panel-head">
              <div>
                <span className="selected-scheme-label">
                  {selectedScheme.type === "preference" ? "偏好方案" : selectedScheme.type === "contrast" ? "反差方案" : "脑洞方案"}
                </span>
                <h3>{selectedScheme.title}</h3>
                <p>{selectedScheme.tagline}</p>
              </div>
              {selectedSchemeDiagnostic && (
                <span className={`scheme-score ${selectedSchemeDiagnostic.tone}`}>
                  {selectedSchemeDiagnostic.verdict} · {selectedSchemeDiagnostic.score}
                </span>
              )}
            </div>
            {(selectedScheme.storyHook || selectedScheme.premise || selectedScheme.storyEngine) && (
              <div className="selected-scheme-engine" aria-label="故事引擎字段">
                {selectedScheme.storyHook && (
                  <span>
                    <strong>钩子</strong>
                    {selectedScheme.storyHook}
                  </span>
                )}
                {selectedScheme.premise && (
                  <span>
                    <strong>Premise</strong>
                    {selectedScheme.premise}
                  </span>
                )}
                {selectedScheme.storyEngine && (
                  <span>
                    <strong>引擎</strong>
                    {selectedScheme.storyEngine}
                  </span>
                )}
              </div>
            )}
            {selectedSchemeDiagnostic && selectedSchemeDiagnostic.risks.length > 0 && (
              <div className="selected-scheme-risks compact">
                <strong>优先补</strong>
                <div>
                  {selectedSchemeDiagnostic.risks.slice(0, 2).map((risk) => (
                    <span key={`${risk.label}-${risk.fixHint}`}>
                      {risk.label}：{risk.fixHint}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
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
            onUpdateNode={handleUpdateNode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onEnhanceNode={handleEnhanceNode}
            enhancingNodeId={enhancingNodeId}
            enhanceStatus={enhanceStatus}
          />
        ) : (
          <article className="editor-surface editor-empty-state">
            <div>
              <p className="eyebrow">架构模式</p>
              <h2>等待灵感引爆</h2>
            </div>
            <p>输入一个词、一个意象或一句灵感并选择方案后，这里会生成完整大纲节点。</p>
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
            theorySuggestionStates={theorySuggestionStates}
            onTheorySuggestionStatesChange={setTheorySuggestionStates}
          />
        </section>

        <section className="quality-panel">
          <QualityChecklistPanel nodes={outlineNodes} />
        </section>

        <section className="emotion-panel">
          <div className="section-title">
            <Waves size={16} aria-hidden />
            <span>情绪节拍器</span>
          </div>
          {emotionBeats.length > 0 ? (
            <>
              <div className="emotion-beat-list">
                {emotionBeats.map(({ node, goal }) => (
                  <article className={`emotion-beat-item ${selectedNodeId === node.id ? "selected" : ""}`} key={node.id}>
                    <strong>{node.title}</strong>
                    <span>{goal.emotion}</span>
                    <small>强度 {goal.intensity}</small>
                  </article>
                ))}
              </div>
              {selectedEmotionBeat && (
                <div className="emotion-goal-summary">
                  <strong>{selectedEmotionBeat.node.title}</strong>
                  <span>
                    {selectedEmotionBeat.goal.emotion} · 强度 {selectedEmotionBeat.goal.intensity}
                  </span>
                  <p>{selectedEmotionBeat.goal.promise}</p>
                </div>
              )}
            </>
          ) : (
            <p className="emotion-empty">生成大纲后，这里会展示每个节点的读者情绪目标。</p>
          )}
          <div className="guardrail">
            <ShieldCheck size={16} aria-hidden />
            <span>情绪目标会随项目保存和 Markdown 导出</span>
          </div>
        </section>
      </aside>
    </main>
  );
}
