import type { SeedIgnitionInput } from "@/types/product";
import { buildPrompt } from "./index";

export const seedPromptVersion = "seed-ignition-v1.1";

export function buildSeedIgnitionPrompt(input: SeedIgnitionInput) {
  const result = buildPrompt("seed.ignite", {
    userInput: input.seedText,
    userPreference: input.userPreference,
    systemConstraints: ["输出必须是合法的 JSON 格式", "不生成违法违规内容"]
  });

  return result.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
}

export function buildTasteSamplesPrompt() {
  const result = buildPrompt("taste.generate-samples");
  return result.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
}

export function buildTasteAnalysisPrompt(choices: Array<{ sampleId: string; liked: boolean }>) {
  const result = buildPrompt("taste.analyze-preference", {
    additionalContext: { choices }
  });
  return result.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
}
