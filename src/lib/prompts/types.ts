export type PromptTemplateType =
  | "taste.generate-samples"
  | "taste.analyze-preference"
  | "seed.ignite"
  | "theory.explain-check"
  | "setting.extract-keywords";

export type PromptOptimizationMode = "template-only" | "ai-enhanced" | "ai-generated";

export interface PromptContext {
  userInput?: string;
  userPreference?: unknown;
  systemConstraints?: string[];
  outputFormat?: string;
  additionalContext?: Record<string, unknown>;
}

export interface PromptTemplate {
  id: PromptTemplateType;
  version: string;
  purpose: string;
  systemPrompt: string;
  userPrompt: string;
  constraints: string[];
  defaultOutputFormat: string;
}

export interface BuiltPrompt {
  templateId: PromptTemplateType;
  templateVersion: string;
  optimizationMode: PromptOptimizationMode;
  messages: Array<{ role: "system" | "user"; content: string }>;
}

export interface PromptGenerationOptions {
  optimizationMode?: PromptOptimizationMode;
  forceRegenerate?: boolean;
}