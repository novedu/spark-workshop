"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, Trash2, Edit3, Clock, FileText } from "lucide-react";
import { localStore } from "@/lib/storage";
import type { Project } from "@/types/product";

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
}

export function ProjectList({ onSelectProject, onCreateProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <button onClick={onCreateProject} className="primary-button">
          <Plus size={20} />
          新建项目
        </button>
      </div>
    );
  }

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>我的项目</h2>
        <button onClick={onCreateProject} className="primary-button">
          <Plus size={18} />
          新建
        </button>
      </div>
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