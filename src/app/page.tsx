"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { CreativeWorkbench } from "@/components/CreativeWorkbench";
import { ProjectList } from "@/components/ProjectList";
import { StorageSmokePanel } from "@/components/StorageSmokePanel";
import { TasteTestPage } from "@/components/TasteTestPage";
import { WelcomePage } from "@/components/WelcomePage";
import { localStore } from "@/lib/storage";
import type { Project, UserPreference } from "@/types/product";

type ViewMode = "welcome" | "taste-test" | "list" | "workbench";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    setLoading(true);
    setInitialError(null);
    try {
      const preference = await localStore.getPreference();
      const projects = await localStore.listProjects();

      if (!preference && projects.length === 0) {
        setViewMode("welcome");
      } else if (!preference) {
        setViewMode("taste-test");
      } else {
        setViewMode("list");
      }
    } catch (err) {
      console.warn("Failed to check initial status:", err);
      setInitialError("本地数据读取失败，可以重试或先进入项目列表。");
      setViewMode("list");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setViewMode("workbench");
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setViewMode("workbench");
  };

  const handleBack = () => {
    setViewMode("list");
    setSelectedProject(null);
  };

  const handleProjectSaved = (project: Project) => {
    setSelectedProject(project);
  };

  const handleWelcomeStart = () => {
    setViewMode("taste-test");
  };

  const handleWelcomeSkip = () => {
    setViewMode("list");
  };

  const handleTasteTestComplete = (preference: UserPreference) => {
    console.log("Taste test complete:", preference);
    setViewMode("list");
  };

  const handleTasteTestSkip = () => {
    setViewMode("list");
  };

  if (loading) {
    return (
      <div className="app-container">
        <StorageSmokePanel />
        <div className="project-list-loading">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="app-container">
        <StorageSmokePanel />
        <div className="project-list-error">
          <p>{initialError}</p>
          <div className="empty-actions">
            <button onClick={checkInitialStatus} className="primary-button" type="button">
              <RefreshCw size={18} />
              重试
            </button>
            <button onClick={() => setInitialError(null)} className="secondary-button" type="button">
              进入项目列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "welcome") {
    return (
      <>
        <StorageSmokePanel />
        <WelcomePage onStart={handleWelcomeStart} onSkip={handleWelcomeSkip} />
      </>
    );
  }

  if (viewMode === "taste-test") {
    return (
      <>
        <StorageSmokePanel />
        <TasteTestPage onComplete={handleTasteTestComplete} onSkip={handleTasteTestSkip} />
      </>
    );
  }

  if (viewMode === "workbench") {
    return (
      <>
        <StorageSmokePanel />
        <CreativeWorkbench
          project={selectedProject}
          onBack={handleBack}
          onProjectSaved={handleProjectSaved}
        />
      </>
    );
  }

  return (
    <div className="app-container">
      <StorageSmokePanel />
      <ProjectList
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
