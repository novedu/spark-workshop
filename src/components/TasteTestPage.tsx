"use client";

import { useState, useEffect } from "react";
import { Heart, XCircle, Sparkles, ChevronLeft, ChevronRight, CheckCircle, Clock, Zap, Brain, Waves } from "lucide-react";
import { getAiRecoveryCopy } from "@/lib/ai-recovery-copy";
import { shouldConfirmAiOperation } from "@/lib/ai-usage-settings";
import { llmProvider } from "@/lib/llm";
import { localStore } from "@/lib/storage";
import type { TasteSample, TasteChoice } from "@/lib/llm/types";
import type { UserPreference } from "@/types/product";

interface TasteTestPageProps {
  onComplete: (preference: UserPreference) => void;
  onSkip: () => void;
}

type TestPhase = "intro" | "testing" | "analyzing" | "result";

const paceLabels: Record<string, string> = {
  fast: "快节奏",
  medium: "中等节奏",
  slow: "慢节奏"
};

const infoGapLabels: Record<string, string> = {
  high: "高信息差",
  medium: "中等信息差",
  low: "低信息差"
};

const emotionLabels: Record<string, string> = {
  high: "高情绪",
  medium: "中等情绪",
  low: "低情绪"
};

const styleLabels: Record<string, string> = {
  qidian: "起点风",
  feilu: "飞卢风",
  jinjiang: "晋江风",
  balanced: "均衡风格"
};

export function TasteTestPage({ onComplete, onSkip }: TasteTestPageProps) {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [samples, setSamples] = useState<TasteSample[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<TasteChoice[]>([]);
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase === "testing" && samples.length === 0) {
      loadSamples();
    }
  }, [phase, samples.length]);

  const loadSamples = async () => {
    if (
      shouldConfirmAiOperation() &&
      !window.confirm("生成味觉样本可能调用真实 AI，并消耗 token。继续吗？")
    ) {
      setPhase("intro");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await llmProvider.generateTasteSamples();
      setSamples(result);
    } catch (err) {
      console.error("Failed to load taste samples:", err);
      setError(getAiRecoveryCopy(err, "味觉样本生成").message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setSamples([]);
    setCurrentIndex(0);
    setChoices([]);
    setPreference(null);
    setError(null);
    setPhase("testing");
  };

  const handleChoice = (liked: boolean) => {
    const sample = samples[currentIndex];
    if (!sample) return;

    const newChoices = [...choices, { sampleId: sample.id, liked }];
    setChoices(newChoices);

    if (currentIndex < samples.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      analyzePreference(newChoices);
    }
  };

  const analyzePreference = async (allChoices: TasteChoice[]) => {
    if (
      shouldConfirmAiOperation() &&
      !window.confirm("生成口味画像可能调用真实 AI，并消耗 token。继续吗？")
    ) {
      setError("已取消口味画像分析，你的选择还在，可以继续或跳过。");
      setPhase("testing");
      return;
    }

    setPhase("analyzing");
    setError(null);
    try {
      const result = await llmProvider.analyzeTastePreference(allChoices);
      setPreference(result);
      await localStore.savePreference(result);
      setPhase("result");
    } catch (err) {
      console.error("Failed to analyze preference:", err);
      setError(getAiRecoveryCopy(err, "口味画像分析").message);
      setPhase("result");
    }
  };

  const handleRetryAnalyze = () => {
    if (choices.length === 0) {
      handleStart();
      return;
    }

    analyzePreference(choices);
  };

  const handleComplete = () => {
    if (preference) {
      onComplete(preference);
    }
  };

  const currentSample = samples[currentIndex];
  const progress = samples.length > 0 ? ((currentIndex + 1) / samples.length) * 100 : 0;

  if (phase === "intro") {
    return (
      <div className="taste-test-container intro-phase">
        <div className="intro-content">
          <div className="intro-icon">
            <Sparkles size={64} />
          </div>
          <h1>味觉测试</h1>
          <p>回答几个简单问题，让我更了解你的网文口味</p>
          <div className="intro-steps">
            <div className="step">
              <span>1</span>
              <span>阅读 6 段原创开篇</span>
            </div>
            <div className="step">
              <span>2</span>
              <span>选择喜欢或不喜欢</span>
            </div>
            <div className="step">
              <span>3</span>
              <span>生成你的口味画像</span>
            </div>
          </div>
          <div className="intro-actions">
            <button className="primary-button" onClick={handleStart}>
              <Sparkles size={18} />
              开始测试
            </button>
            <button className="secondary-button" onClick={onSkip}>
              跳过测试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "testing") {
    return (
      <div className="taste-test-container testing-phase">
        <div className="testing-header">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{currentIndex + 1} / {samples.length}</span>
        </div>

        {loading ? (
          <div className="sample-loading">
            <div className="spinner" />
            <p>正在生成样本...</p>
          </div>
        ) : error ? (
          <div className="sample-error">
            <XCircle size={36} aria-hidden />
            <h2>样本暂时没生成出来</h2>
            <p>{error}</p>
            <div className="empty-actions">
              <button className="primary-button" type="button" onClick={loadSamples}>
                <Sparkles size={18} />
                重试生成
              </button>
              <button className="secondary-button" type="button" onClick={onSkip}>
                跳过测试
              </button>
            </div>
          </div>
        ) : currentSample ? (
          <div className="sample-card">
            <div className="sample-label">{currentSample.label}</div>
            <div className="sample-hint">{currentSample.styleHint}</div>
            <p className="sample-text">{currentSample.text}</p>
            <div className="sample-actions">
              <button className="dislike-button" onClick={() => handleChoice(false)}>
                <XCircle size={24} />
                <span>不喜欢</span>
              </button>
              <button className="like-button" onClick={() => handleChoice(true)}>
                <Heart size={24} />
                <span>喜欢</span>
              </button>
            </div>
            <div className="navigation-hint">
              {currentIndex > 0 && (
                <button className="nav-button" onClick={() => setCurrentIndex(currentIndex - 1)}>
                  <ChevronLeft size={18} />
                  上一段
                </button>
              )}
              {currentIndex < samples.length - 1 && (
                <button className="nav-button" onClick={() => setCurrentIndex(currentIndex + 1)}>
                  下一段
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="sample-error">
            <Sparkles size={36} aria-hidden />
            <h2>还没有可用样本</h2>
            <p>可以重新生成样本，或先跳过测试进入项目列表。</p>
            <div className="empty-actions">
              <button className="primary-button" type="button" onClick={loadSamples}>
                <Sparkles size={18} />
                生成样本
              </button>
              <button className="secondary-button" type="button" onClick={onSkip}>
                跳过测试
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="taste-test-container analyzing-phase">
        <div className="analyzing-content">
          <div className="spinner large" />
          <h2>正在分析你的口味...</h2>
          <p>根据你的选择，生成专属阅读偏好画像</p>
        </div>
      </div>
    );
  }

  if (phase === "result" && preference) {
    return (
      <div className="taste-test-container result-phase">
        <div className="result-content">
          <div className="result-icon">
            <CheckCircle size={48} />
          </div>
          <h1>口味画像生成完成</h1>
          <p>这是你的阅读偏好分析结果</p>

          <div className="preference-grid">
            <div className="preference-card">
              <Clock size={24} />
              <div>
                <span className="preference-label">节奏偏好</span>
                <span className="preference-value">{paceLabels[preference.pacePreference] || preference.pacePreference}</span>
              </div>
            </div>
            <div className="preference-card">
              <Brain size={24} />
              <div>
                <span className="preference-label">信息差容忍度</span>
                <span className="preference-value">{infoGapLabels[preference.infoGapTolerance] || preference.infoGapTolerance}</span>
              </div>
            </div>
            <div className="preference-card">
              <Waves size={24} />
              <div>
                <span className="preference-label">情绪振幅</span>
                <span className="preference-value">{emotionLabels[preference.emotionAmplitude] || preference.emotionAmplitude}</span>
              </div>
            </div>
            <div className="preference-card">
              <Zap size={24} />
              <div>
                <span className="preference-label">风格倾向</span>
                <span className="preference-value">{styleLabels[preference.styleTendency] || preference.styleTendency}</span>
              </div>
            </div>
          </div>

          <div className="result-actions">
            <button className="primary-button" onClick={handleComplete}>
              <Sparkles size={18} />
              开始创作
            </button>
            <button className="secondary-button" onClick={handleStart}>
              重新测试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="taste-test-container result-phase">
        <div className="sample-error">
          <XCircle size={40} aria-hidden />
          <h1>口味画像暂时没算出来</h1>
          <p>{error || "分析过程被中断，可以重试分析，或先跳过测试继续使用。"}</p>
          <div className="empty-actions">
            <button className="primary-button" type="button" onClick={handleRetryAnalyze}>
              <Sparkles size={18} />
              重试分析
            </button>
            <button className="secondary-button" type="button" onClick={onSkip}>
              跳过测试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
