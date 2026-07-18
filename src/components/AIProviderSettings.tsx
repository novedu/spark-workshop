"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  KeyRound,
  PlugZap,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  ZapOff
} from "lucide-react";
import {
  defaultAiUsageSettings,
  getAiUsageSettings,
  saveAiUsageSettings,
  type AiUsageSettings
} from "@/lib/ai-usage-settings";
import { getAiRecoveryCopy } from "@/lib/ai-recovery-copy";
import {
  failAiRun,
  finishAiRun,
  listAiRuns,
  resetAiUsageEvents,
  summarizeAiUsageEvents,
  startAiRun,
  type AiRunRecord,
  type AiRunStatus,
  type AiUsageEventSource,
  type AiUsageSummary
} from "@/lib/ai-usage-meter";
import { aiNecessityCopy, aiOperationProfiles } from "@/lib/status-copy";

type ProviderPreset = {
  id: string;
  name: string;
  provider: "openai" | "claude" | "ollama";
  baseUrl: string;
  model: string;
  status: "ready" | "gateway" | "planned";
  note: string;
};

type LlmHealthResponse = {
  ok: boolean;
  configured: boolean;
  useMock: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  probe: "skipped" | "passed" | "failed";
  contentPreview?: string;
  error?: string;
};

interface AIProviderSettingsProps {
  onBack: () => void;
}

const providerPresets: ProviderPreset[] = [
  {
    id: "zhuozaiya",
    name: "卓在崖中转",
    provider: "openai",
    baseUrl: "https://www.zhuozaiya.top/v1",
    model: "gpt-4.1-mini",
    status: "gateway",
    note: "按 OpenAI-compatible 协议接入，适合当前本地验证。"
  },
  {
    id: "openai",
    name: "OpenAI",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    status: "ready",
    note: "默认官方 OpenAI-compatible 接入。"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    status: "gateway",
    note: "OpenAI-compatible 形态，具体模型以控制台为准。"
  },
  {
    id: "qwen",
    name: "通义千问",
    provider: "openai",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    status: "gateway",
    note: "DashScope 兼容模式，适合中文网文场景对比。"
  },
  {
    id: "moonshot",
    name: "Kimi / Moonshot",
    provider: "openai",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    status: "gateway",
    note: "OpenAI-compatible 形态，长文本模型可后续单独评估。"
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    provider: "openai",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    status: "gateway",
    note: "OpenAI-compatible 形态，模型名按控制台调整。"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    provider: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini",
    status: "gateway",
    note: "多模型网关，适合横向比较输出质量。"
  },
  {
    id: "ollama",
    name: "Ollama 本地模型",
    provider: "openai",
    baseUrl: "http://localhost:11434/v1",
    model: "qwen2.5:7b",
    status: "gateway",
    note: "本地 OpenAI-compatible 入口，输出质量取决于本地模型。"
  },
  {
    id: "claude-native",
    name: "Claude Native",
    provider: "claude",
    baseUrl: "https://api.anthropic.com",
    model: "claude-3-5-sonnet-latest",
    status: "planned",
    note: "已预留 provider 名称，原生 adapter 后续接入。"
  },
  {
    id: "gemini-native",
    name: "Gemini Native",
    provider: "openai",
    baseUrl: "按 Google AI Studio / Vertex AI 控制台填写",
    model: "gemini-pro",
    status: "planned",
    note: "V1 先通过兼容网关接入；原生 Gemini adapter 后续评估。"
  }
];

const acceptanceItems = [
  "Health probe 能通过当前服务端配置",
  "味觉测试生成 6 段原创开篇",
  "味觉测试完成后生成偏好画像",
  "灵感引爆能生成 3 个世界观方案",
  "理论检测命中项能生成 AI 解释"
];

const providerStatusLabel: Record<ProviderPreset["status"], string> = {
  ready: "内置支持",
  gateway: "兼容支持",
  planned: "后续适配"
};

const aiRunStatusLabel: Record<AiRunStatus, string> = {
  pending: "进行中",
  success: "完成",
  fallback: "已兜底",
  failed: "失败"
};

const aiRunSourceLabel: Record<AiUsageEventSource, string> = {
  llm: "真实 AI",
  cache: "缓存",
  mock: "本地兜底",
  local: "本地规则"
};

const operationNameById = Object.fromEntries(aiOperationProfiles.map((profile) => [profile.id, profile.name])) as Record<
  AiRunRecord["operationId"],
  string
>;

const formatRunTime = (isoTime: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoTime));

const formatDuration = (durationMs?: number) => {
  if (durationMs === undefined) return "计时中";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
};

const getAiRunSourceLabel = (run: AiRunRecord) => {
  if (!run.source) return "等待结果";
  if (run.source === "local" && run.status === "failed") return "未调用模型";
  return aiRunSourceLabel[run.source];
};

export function AIProviderSettings({ onBack }: AIProviderSettingsProps) {
  const [selectedId, setSelectedId] = useState("zhuozaiya");
  const [model, setModel] = useState(providerPresets[0].model);
  const [health, setHealth] = useState<LlmHealthResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [probing, setProbing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [usageSettings, setUsageSettings] = useState<AiUsageSettings>(defaultAiUsageSettings);
  const [usageSummary, setUsageSummary] = useState<AiUsageSummary>(() => summarizeAiUsageEvents());
  const [recentRuns, setRecentRuns] = useState<AiRunRecord[]>(() => listAiRuns().slice().reverse().slice(0, 8));

  const selectedPreset = useMemo(
    () => providerPresets.find((preset) => preset.id === selectedId) ?? providerPresets[0],
    [selectedId]
  );

  const envSnippet = useMemo(
    () =>
      [
        `LLM_PROVIDER=${selectedPreset.provider}`,
        `LLM_BASE_URL=${selectedPreset.baseUrl}`,
        "LLM_API_KEY=<your_api_key>",
        `LLM_MODEL=${model || selectedPreset.model}`,
        "LLM_TIMEOUT_MS=30000",
        "LLM_USE_MOCK=false"
      ].join("\n"),
    [model, selectedPreset]
  );

  useEffect(() => {
    setModel(selectedPreset.model);
  }, [selectedPreset]);

  useEffect(() => {
    void checkHealth(false);
    setUsageSettings(getAiUsageSettings());
    refreshTelemetry();
  }, []);

  const refreshTelemetry = () => {
    setUsageSummary(summarizeAiUsageEvents());
    setRecentRuns(listAiRuns().slice().reverse().slice(0, 8));
  };

  const checkHealth = async (probe: boolean) => {
    if (
      probe &&
      usageSettings.confirmHighCostActions &&
      !window.confirm("真实探测会调用一次真实 AI，用于确认链路是否可用。继续吗？")
    ) {
      return;
    }

    const runId = probe ? startAiRun("healthProbe") : null;

    setMessage(null);
    if (probe) {
      setProbing(true);
    } else {
      setChecking(true);
    }

    try {
      const response = await fetch(`/api/llm/health${probe ? "?probe=1" : ""}`);
      const payload = (await response.json()) as LlmHealthResponse;
      setHealth(payload);
      if (probe) {
        if (payload.probe === "passed") {
          finishAiRun(runId!, "llm");
        } else {
          failAiRun(runId!, payload.error || "真实探测失败。");
        }
        refreshTelemetry();
      }
      if (!response.ok) {
        setMessage(getAiRecoveryCopy(payload.error || "模型探测失败。", probe ? "真实探测" : "AI 状态读取").message);
      }
    } catch (error) {
      if (runId) {
        failAiRun(runId, error);
        refreshTelemetry();
      }
      setMessage(getAiRecoveryCopy(error, probe ? "真实探测" : "AI 状态读取").message);
    } finally {
      setChecking(false);
      setProbing(false);
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(envSnippet);
      setMessage("配置片段已复制。");
    } catch {
      setMessage("复制失败，可以手动选择配置片段。");
    }
  };

  const updateUsageSettings = (updates: Partial<AiUsageSettings>) => {
    const nextSettings = {
      ...usageSettings,
      ...updates
    };
    setUsageSettings(nextSettings);
    saveAiUsageSettings(nextSettings);
    if ("saveTokenMode" in updates) {
      setMessage(nextSettings.saveTokenMode ? "省 token 模式已开启。" : "省 token 模式已关闭。");
      return;
    }
    if ("confirmHighCostActions" in updates) {
      setMessage(nextSettings.confirmHighCostActions ? "高成本动作确认已开启。" : "高成本动作确认已关闭。");
    }
  };

  const resetUsageSummary = () => {
    resetAiUsageEvents();
    refreshTelemetry();
    setMessage("本轮 AI 调用统计与 run 记录已清空。");
  };

  const configured = health?.configured ?? false;
  const healthStatusText = !health
    ? "未读取"
    : configured
      ? health.probe === "passed"
        ? "真实链路可用"
        : "已配置"
      : "未配置";

  return (
    <div className="ai-settings-page">
      <div className="ai-settings-header">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          返回项目
        </button>
        <div>
          <h2>AI 设置</h2>
          <p>配置服务端代理，检查真实模型链路。</p>
        </div>
      </div>

      <section className="ai-status-panel">
        <div className="ai-status-title">
          <Server size={18} aria-hidden />
          <span>当前运行配置</span>
          <strong className={configured ? "ok" : "muted"}>{healthStatusText}</strong>
        </div>
        <div className="ai-status-grid">
          <span>Provider：{health?.provider ?? "未知"}</span>
          <span>Model：{health?.model ?? "未知"}</span>
          <span>Base URL：{health?.baseUrl ?? "未知"}</span>
          <span>Mock：{health?.useMock ? "开启" : "关闭"}</span>
        </div>
        {health?.contentPreview && <p className="ai-config-note">Probe 返回：{health.contentPreview}</p>}
        {message && <p className={health?.ok === false ? "ai-config-error" : "ai-config-note"}>{message}</p>}
        <div className="ai-settings-actions">
          <button className="secondary-button" type="button" onClick={() => checkHealth(false)} disabled={checking}>
            <RefreshCw size={16} aria-hidden />
            {checking ? "读取中" : "刷新状态"}
          </button>
          <button className="primary-button" type="button" onClick={() => checkHealth(true)} disabled={probing}>
            <PlugZap size={16} aria-hidden />
            {probing ? "探测中" : "真实探测"}
          </button>
        </div>
      </section>

      <section className="ai-settings-section">
        <div className="section-heading">
          <ZapOff size={18} aria-hidden />
          <span>调用可见化与省 token 模式</span>
        </div>
        <label className="ai-usage-toggle">
          <input
            type="checkbox"
            checked={usageSettings.saveTokenMode}
            onChange={(event) => updateUsageSettings({ saveTokenMode: event.target.checked })}
          />
          <span>
            <strong>省 token 模式</strong>
            <small>开启后，理论解释只使用本地规则；灵感引爆和 AI 补全仍由用户手动触发。</small>
          </span>
        </label>
        <label className="ai-usage-toggle">
          <input
            type="checkbox"
            checked={usageSettings.confirmHighCostActions}
            onChange={(event) => updateUsageSettings({ confirmHighCostActions: event.target.checked })}
          />
          <span>
            <strong>高成本动作确认</strong>
            <small>开启后，灵感引爆、AI 补全、味觉测试和真实探测会先确认再调用。</small>
          </span>
        </label>
        <div className="ai-operation-list" aria-label="AI 调用来源">
          {aiOperationProfiles.map((profile) => (
            <article className="ai-operation-item" key={profile.id}>
              <strong>{profile.name}</strong>
              <span className={`ai-necessity-badge ${profile.necessity}`}>
                {aiNecessityCopy[profile.necessity].label}
              </span>
              <span>{profile.trigger}</span>
              <span>{profile.tokenUse}</span>
              <small>
                {profile.costControl}
                本轮 {usageSummary.byOperation[profile.id]} 次。
              </small>
            </article>
          ))}
        </div>
        <div className="ai-usage-summary" aria-label="本轮 AI 调用统计">
          <span>本轮动作：{usageSummary.totalEvents}</span>
          <span>真实调用：{usageSummary.realCalls}</span>
          <span>缓存命中：{usageSummary.cacheHits}</span>
          <span>本地结果：{usageSummary.localResults}</span>
          <span>估算：约 {usageSummary.estimatedTokens.toLocaleString("zh-CN")} tokens</span>
          <button className="secondary-button" type="button" onClick={resetUsageSummary}>
            清空本轮统计
          </button>
        </div>
        <div className="ai-run-log" aria-label="最近 AI 调用">
          <div className="ai-run-log-heading">
            <strong>最近 AI 调用</strong>
            <span>记录状态、来源、耗时和失败原因，用来排查真实链路是否真的生效。</span>
          </div>
          {recentRuns.length > 0 ? (
            <div className="ai-run-list">
              {recentRuns.map((run) => (
                <article className="ai-run-item" key={run.id}>
                  <div>
                    <strong>{operationNameById[run.operationId]}</strong>
                    <small>{formatRunTime(run.startedAt)}</small>
                  </div>
                  <span className={`ai-run-status ${run.status}`}>{aiRunStatusLabel[run.status]}</span>
                  <span>{getAiRunSourceLabel(run)}</span>
                  <span>{formatDuration(run.durationMs)}</span>
                  <span>约 {run.estimatedTokens.toLocaleString("zh-CN")} tokens</span>
                  {run.error && <small className="ai-run-error">{run.error}</small>}
                </article>
              ))}
            </div>
          ) : (
            <p className="ai-run-empty">本轮还没有 AI 调用记录。触发灵感引爆、AI补全、理论解释或真实探测后会显示在这里。</p>
          )}
        </div>
      </section>

      <section className="ai-settings-section">
        <div className="section-heading">
          <Settings size={18} aria-hidden />
          <span>主流 Provider 预设</span>
        </div>
        <div className="provider-grid">
          {providerPresets.map((preset) => (
            <button
              className={`provider-card ${selectedId === preset.id ? "selected" : ""}`}
              key={preset.id}
              type="button"
              onClick={() => setSelectedId(preset.id)}
            >
              <span className={`provider-status ${preset.status}`}>{providerStatusLabel[preset.status]}</span>
              <strong>{preset.name}</strong>
              <small>{preset.note}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="ai-settings-section">
        <div className="section-heading">
          <KeyRound size={18} aria-hidden />
          <span>.env.local 配置片段</span>
        </div>
        <div className="config-builder">
          <label>
            <span>模型名</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <pre>{envSnippet}</pre>
          <button className="secondary-button" type="button" onClick={copySnippet}>
            <Clipboard size={16} aria-hidden />
            复制配置
          </button>
        </div>
        <p className="ai-config-note">把片段放入 `spark-workshop/.env.local` 后重启开发服务。真实 key 不会进入仓库。</p>
      </section>

      <section className="ai-settings-section">
        <div className="section-heading">
          <ShieldCheck size={18} aria-hidden />
          <span>真实链路验收</span>
        </div>
        <div className="acceptance-list">
          {acceptanceItems.map((item, index) => {
            const passed = index === 0 && health?.probe === "passed";
            return (
              <div className="acceptance-item" key={item}>
                {passed ? <CheckCircle2 size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
                <span>{item}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
