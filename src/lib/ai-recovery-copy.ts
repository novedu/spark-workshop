export type AiRecoveryKind = "timeout" | "config" | "auth" | "rate-limit" | "network" | "unknown";

export type AiRecoveryCopy = {
  kind: AiRecoveryKind;
  message: string;
  actionLabel: string;
};

const getErrorText = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

export const classifyAiError = (error: unknown): AiRecoveryKind => {
  const text = getErrorText(error).toLowerCase();

  if (text.includes("timed out") || text.includes("timeout") || text.includes("aborted")) {
    return "timeout";
  }
  if (text.includes("not configured") || text.includes("api_key") || text.includes("llm_api_key")) {
    return "config";
  }
  if (text.includes("401") || text.includes("unauthorized") || text.includes("authentication")) {
    return "auth";
  }
  if (text.includes("429") || text.includes("rate limit") || text.includes("too many requests")) {
    return "rate-limit";
  }
  if (text.includes("failed to fetch") || text.includes("network") || text.includes("empty reply")) {
    return "network";
  }

  return "unknown";
};

export const getAiRecoveryCopy = (
  error: unknown,
  operationLabel: string,
  options: { fallbackAvailable?: boolean } = {}
): AiRecoveryCopy => {
  const kind = classifyAiError(error);
  const fallbackAvailable = options.fallbackAvailable !== false;

  switch (kind) {
    case "timeout":
      return {
        kind,
        message: fallbackAvailable
          ? `${operationLabel}超时了。当前内容没有丢，可以先用本地兜底继续，稍后再重试真实 AI。`
          : `${operationLabel}超时了。当前内容没有丢，可以保留现有内容，稍后再重试真实 AI。`,
        actionLabel: "稍后重试"
      };
    case "config":
      return {
        kind,
        message: `${operationLabel}需要先完成 AI 配置。可以去 AI 设置检查 key、模型和 Base URL。`,
        actionLabel: "检查设置"
      };
    case "auth":
      return {
        kind,
        message: `${operationLabel}鉴权失败。请检查 API Key 是否有效，或中转站账号是否可用。`,
        actionLabel: "检查 Key"
      };
    case "rate-limit":
      return {
        kind,
        message: fallbackAvailable
          ? `${operationLabel}被限流了。建议稍后重试，或临时开启省 token 模式继续本地流程。`
          : `${operationLabel}被限流了。当前内容没有丢，建议稍后重试真实 AI。`,
        actionLabel: "稍后重试"
      };
    case "network":
      return {
        kind,
        message: `${operationLabel}网络连接失败。可以保留当前内容，稍后重试真实 AI。`,
        actionLabel: "重试"
      };
    default:
      return {
        kind,
        message: fallbackAvailable
          ? `${operationLabel}暂时失败。当前内容没有丢，可以重试或先使用本地兜底继续。`
          : `${operationLabel}暂时失败。当前内容没有丢，可以保留现有内容后重试。`,
        actionLabel: "重试"
      };
  }
};
