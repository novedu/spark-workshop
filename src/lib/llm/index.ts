import { mockLlmProvider } from "./mock-provider";

export const llmProvider = mockLlmProvider;

export type { LlmProvider, TasteChoice, TasteSample } from "./types";
export type { LlmAdapter, LlmAdapterType, LlmGenerateRequest, LlmGenerateResponse } from "./adapters";
