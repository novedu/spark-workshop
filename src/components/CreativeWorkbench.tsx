"use client";

import {
  ArrowLeft,
  Brain,
  ChevronRight,
  Gauge,
  GitBranch,
  PanelRight,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Waves
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import {
  getTheoriesByCategory,
  theoryCategoryDescriptions,
  theoryCategoryLabels
} from "@/lib/theory-library";
import { llmProvider } from "@/lib/llm";
import { createOutlineFromScheme } from "@/lib/outline-template";
import { localStore } from "@/lib/storage";
import { OutlineEditor } from "./OutlineEditor";
import { TheoryCheckerPanel } from "./TheoryCheckerPanel";
import type { EmotionBeat, TheoryCategory, WorldScheme, Project, UserPreference, ProjectSnapshot, OutlineNode } from "@/types/product";

const categories: TheoryCategory[] = [
  "structure",
  "rhythm",
  "economy",
  "psychology",
  "conflict",
  "innovation"
];

const beats: EmotionBeat[] = [
  { id: "b1", label: "黄金开局", chapterHint: "1", emotion: "悬疑", intensity: 4 },
  { id: "b2", label: "救猫咪时刻", chapterHint: "1-3", emotion: "温馨", intensity: 3 },
  { id: "b3", label: "金手指觉醒", chapterHint: "5-8", emotion: "爽", intensity: 5 },
  { id: "b4", label: "第一次重大挫折", chapterHint: "50-60", emotion: "虐", intensity: 4 },
  { id: "b5", label: "中期转折", chapterHint: "100-120", emotion: "爽虐交织", intensity: 5 }
];

interface CreativeWorkbenchProps {
  project?: Project | null;
  onBack: () => void;
}

export function CreativeWorkbench({ project, onBack }: CreativeWorkbenchProps) {
  const [seedText, setSeedText] = useState(project?.seedText || "");
  const [activeCategory, setActiveCategory] = useState<TheoryCategory>("structure");
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

  const activeTheories = useMemo(() => getTheoriesByCategory(activeCategory), [activeCategory]);

  const handleIgnite = async () => {
    if (!seedText.trim()) return;

    setLoading(true);
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
      setSelectedScheme(result.schemes[0]);
      setCoreConcept(result.schemes[0]?.coreConcept || "");
      setPowerSystem(result.schemes[0]?.powerSystem || "");
      setConflictType(result.schemes[0]?.conflictType || "");
    } catch (err) {
      console.error("Ignition failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    const now = new Date().toISOString();
    const isNewProject = !project?.id;
    const schemeData = {
      ...selectedScheme,
      coreConcept,
      powerSystem,
      conflictType
    };

    const projectData: Project = {
      id: project?.id || `project-${Date.now()}`,
      title: selectedScheme.title || "未命名项目",
      seedText: seedText.trim(),
      selectedScheme: schemeData,
      outlineNodes: isNewProject ? createOutlineFromScheme(schemeData) : outlineNodes,
      theoryChecks: project?.theoryChecks || [],
      similarSettingHints: selectedScheme.similarSettingHints || [],
      createdAt: project?.createdAt || now,
      updatedAt: now
    };

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

      setSaveStatus("保存成功");
    } catch (err) {
      setSaveStatus("保存失败");
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSchemeSelect = (scheme: WorldScheme) => {
    setSelectedScheme(scheme);
    setCoreConcept(scheme.coreConcept || "");
    setPowerSystem(scheme.powerSystem || "");
    setConflictType(scheme.conflictType || "");
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
          <ol className="outline-list">
            <li className="active"><span>第一幕</span><small>黄金开局 · 关门</small></li>
            <li><span>第二幕</span><small>升级地图 · 中期转折</small></li>
            <li><span>第三幕</span><small>绝地反击 · 结局收束</small></li>
          </ol>
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
            <button className="icon-button" type="button" title="刷新方案" disabled={loading}>
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
            {saveStatus && (
              <span className={`save-status ${saveStatus === "保存成功" ? "success" : "error"}`}>
                {saveStatus}
              </span>
            )}
          </div>
        </header>

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
          <>
            <div className="seed-composer">
              <textarea
                aria-label="灵感种子"
                value={seedText}
                maxLength={100}
                onChange={(event) => setSeedText(event.target.value)}
                placeholder="输入一句灵感，比如：长廊，触手，吞噬记忆"
              />
              <button className="primary-button" type="button" onClick={handleIgnite} disabled={loading}>
                <WandSparkles size={18} className={loading ? "spinning" : ""} aria-hidden />
                {loading ? "引爆中..." : "引爆"}
              </button>
            </div>

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
                  </button>
                ))}
              </div>
            )}

            <article className="editor-surface">
              <div className="editor-header">
                <div>
                  <p className="eyebrow">架构模式</p>
                  <h2>{selectedScheme.title}</h2>
                </div>
                <span className="status-pill">理论检测中</span>
              </div>

              <div className="field-stack">
                <label>
                  核心设定
                  <textarea
                    value={coreConcept}
                    onChange={(e) => setCoreConcept(e.target.value)}
                    placeholder="描述你的世界观核心..."
                  />
                </label>
                <label>
                  力量体系
                  <textarea
                    value={powerSystem}
                    onChange={(e) => setPowerSystem(e.target.value)}
                    placeholder="描述力量的来源、限制和代价..."
                  />
                </label>
                <label>
                  核心冲突
                  <input
                    value={conflictType}
                    onChange={(e) => setConflictType(e.target.value)}
                    placeholder="主角想要什么？阻碍是什么？"
                  />
                </label>
              </div>
            </article>
          </>
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

        <div className="category-tabs" role="tablist" aria-label="理论类别">
          {categories.map((category) => (
            <button
              aria-selected={activeCategory === category}
              className={activeCategory === category ? "active" : ""}
              key={category}
              onClick={() => setActiveCategory(category)}
              role="tab"
              type="button"
            >
              {theoryCategoryLabels[category]}
            </button>
          ))}
        </div>

        <section className="theory-panel">
          <TheoryCheckerPanel
            project={project || null}
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