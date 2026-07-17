"use client";

import { Sparkles, BookOpen, Brain, WandSparkles, ArrowRight } from "lucide-react";

interface WelcomePageProps {
  onStart: () => void;
  onSkip: () => void;
}

const features = [
  {
    icon: WandSparkles,
    title: "灵感引爆",
    description: "输入一句话灵感，AI 生成 3 个世界观方案供你选择"
  },
  {
    icon: Brain,
    title: "理论检测",
    description: "30 条网文写作理论实时检测，帮你避开常见坑点"
  },
  {
    icon: BookOpen,
    title: "大纲管理",
    description: "结构化大纲编辑器，从世界观到伏笔一网打尽"
  }
];

export function WelcomePage({ onStart, onSkip }: WelcomePageProps) {
  return (
    <div className="welcome-container">
      <div className="welcome-hero">
        <div className="hero-icon">
          <Sparkles size={48} />
        </div>
        <h1>灵光一闪</h1>
        <p className="hero-tagline">AI 驱动的网文写作辅助工具</p>
        <p className="hero-description">
          用 AI 引爆灵感，用理论护航创作，让你的故事从第一句话就与众不同
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <Icon size={28} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          );
        })}
      </div>

      <div className="welcome-actions">
        <button className="primary-button welcome-primary" onClick={onStart}>
          <Sparkles size={18} />
          开始创作之旅
          <ArrowRight size={18} />
        </button>
        <button className="secondary-button" onClick={onSkip}>
          跳过，直接进入
        </button>
      </div>

      <div className="welcome-footer">
        <p>基于 30 条网文写作理论 · AI 驱动 · 本地存储</p>
      </div>
    </div>
  );
}