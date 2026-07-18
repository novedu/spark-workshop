"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, Trash2, Edit3, Clock, FileText, RotateCcw, Database, Settings, ClipboardCheck } from "lucide-react";
import { localStore } from "@/lib/storage";
import type { Project } from "@/types/product";

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
  onOpenAiSettings: () => void;
  onOpenTheoryEval: () => void;
}

export function ProjectList({ onSelectProject, onCreateProject, onOpenAiSettings, onOpenTheoryEval }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await localStore.listProjects();
      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载项目失败");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPreference = async () => {
    setError(null);
    setResetMessage(null);
    try {
      await localStore.clearPreferences();
      setResetMessage("口味画像已重置。刷新后会重新进入味觉测试。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置口味画像失败");
    }
  };

  const handleClearProjects = async () => {
    if (confirmText.trim() !== "清空项目") {
      setError("请输入“清空项目”后再执行。");
      return;
    }

    setError(null);
    setResetMessage(null);
    try {
      await localStore.clearProjects();
      await localStore.clearSnapshots();
      setConfirmText("");
      setResetMessage("项目和快照已清空。");
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "清空项目失败");
    }
  };

  const handleResetAll = async () => {
    if (confirmText.trim() !== "重置全部") {
      setError("请输入“重置全部”后再执行。");
      return;
    }

    setError(null);
    setResetMessage(null);
    try {
      await localStore.resetAll();
      setProjects([]);
      setConfirmText("");
      setResetMessage("本地数据已全部重置。刷新后会回到新用户流程。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置本地数据失败");
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个项目吗？")) return;

    try {
      await localStore.deleteProject(projectId);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除项目失败");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="project-list-loading">
        <div className="loading-spinner" />
        <p>加载项目中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-list-error">
        <p>加载失败：{error}</p>
        <button onClick={loadProjects} className="primary-button">重试</button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="project-list-empty">
        <div className="empty-icon">
          <Sparkles size={48} />
        </div>
        <h2>还没有项目</h2>
        <p>输入一句灵感，开始你的第一个创意之旅</p>
        <div className="project-empty-actions">
          <button onClick={onCreateProject} className="primary-button">
            <Plus size={20} />
            新建项目
          </button>
          <button onClick={onOpenAiSettings} className="secondary-button" type="button">
            <Settings size={18} aria-hidden />
            AI 设置
          </button>
          <button
            onClick={onOpenTheoryEval}
            className="secondary-button"
            type="button"
            title="打开理论诊断样例验收"
          >
            <ClipboardCheck size={18} aria-hidden />
            理论样例
          </button>
        </div>
        <div className="local-data-panel compact" aria-label="本地数据管理">
          <div className="local-data-heading">
            <Database size={16} aria-hidden />
            <span>本地数据</span>
          </div>
          <button className="secondary-button" type="button" onClick={handleResetPreference}>
            <RotateCcw size={16} aria-hidden />
            重置口味画像
          </button>
          {resetMessage && <p className="reset-message">{resetMessage}</p>}
          {error && <p className="reset-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="project-list">
      <div className="project-list-header">
        <div>
          <h2>我的项目</h2>
          <p>{projects.length} 个本地项目</p>
        </div>
        <div className="project-list-actions">
          <button onClick={onOpenAiSettings} className="secondary-button" type="button">
            <Settings size={16} aria-hidden />
            AI 设置
          </button>
          <button
            onClick={onOpenTheoryEval}
            className="secondary-button"
            type="button"
            title="打开理论诊断样例验收"
          >
            <ClipboardCheck size={16} aria-hidden />
            理论样例
          </button>
          <button onClick={onCreateProject} className="primary-button">
            <Plus size={18} />
            新建
          </button>
        </div>
      </div>
      <section className="local-data-panel" aria-label="本地数据管理">
        <div className="local-data-heading">
          <Database size={16} aria-hidden />
          <span>本地数据管理</span>
        </div>
        <p>清理只影响当前浏览器的 IndexedDB 数据。</p>
        <div className="local-data-controls">
          <button className="secondary-button" type="button" onClick={handleResetPreference}>
            <RotateCcw size={16} aria-hidden />
            重置口味画像
          </button>
          <input
            aria-label="清理确认文本"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="输入：清空项目 / 重置全部"
          />
          <button className="secondary-button danger" type="button" onClick={handleClearProjects}>
            <Trash2 size={16} aria-hidden />
            清空项目
          </button>
          <button className="secondary-button danger" type="button" onClick={handleResetAll}>
            <Trash2 size={16} aria-hidden />
            重置全部
          </button>
        </div>
        {resetMessage && <p className="reset-message">{resetMessage}</p>}
      </section>
      <div className="project-grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => onSelectProject(project)}
          >
            <div className="project-card-header">
              <h3>{project.title || "未命名项目"}</h3>
              <div className="project-card-actions">
                <button
                  className="icon-button"
                  type="button"
                  title="编辑"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(project);
                  }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  className="icon-button danger"
                  type="button"
                  title="删除"
                  onClick={(e) => handleDelete(project.id, e)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="project-card-seed">{project.seedText}</p>
            <p className="project-card-concept">
              {project.selectedScheme?.coreConcept?.slice(0, 100)}...
            </p>
            <div className="project-card-footer">
              <span className="project-card-date">
                <Clock size={12} />
                {formatDate(project.updatedAt)}
              </span>
              <span className="project-card-nodes">
                <FileText size={12} />
                {project.outlineNodes?.length || 0} 个节点
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
