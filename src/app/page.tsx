"use client";

import { useState, useEffect } from "react";
import { CreativeWorkbench } from "@/components/CreativeWorkbench";
import { ProjectList } from "@/components/ProjectList";
import { TasteTestPage } from "@/components/TasteTestPage";
import { WelcomePage } from "@/components/WelcomePage";
import { localStore } from "@/lib/storage";
import type { Project, UserPreference } from "@/types/product";

type ViewMode = "welcome" | "taste-test" | "list" | "workbench";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    setLoading(true);
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
        <div className="project-list-loading">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "welcome") {
    return <WelcomePage onStart={handleWelcomeStart} onSkip={handleWelcomeSkip} />;
  }

  if (viewMode === "taste-test") {
    return <TasteTestPage onComplete={handleTasteTestComplete} onSkip={handleTasteTestSkip} />;
  }

  if (viewMode === "workbench") {
    return <CreativeWorkbench project={selectedProject} onBack={handleBack} />;
  }

  return (
    <div className="app-container">
      <ProjectList
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}