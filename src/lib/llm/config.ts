import type { LlmAdapterType } from "./adapters";

export type LlmRuntimeConfig = {
  provider: LlmAdapterType;
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs: number;
  useMock: boolean;
  configured: boolean;
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const parseTimeout = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
};

const parseProvider = (value: string | undefined): LlmAdapterType => {
  if (value === "claude" || value === "ollama") return value;
  return "openai";
};

export const getLlmRuntimeConfig = (): LlmRuntimeConfig => {
  const apiKey = process.env.LLM_API_KEY?.trim();
  const useMock = process.env.LLM_USE_MOCK === "true" || !apiKey;

  return {
    provider: parseProvider(process.env.LLM_PROVIDER),
    baseUrl: normalizeBaseUrl(process.env.LLM_BASE_URL || "https://api.openai.com/v1"),
    apiKey,
    model: process.env.LLM_MODEL || "gpt-4.1-mini",
    timeoutMs: parseTimeout(process.env.LLM_TIMEOUT_MS),
    useMock,
    configured: Boolean(apiKey) && !useMock
  };
};
