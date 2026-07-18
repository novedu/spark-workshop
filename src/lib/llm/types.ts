import type {
  OutlineNodeEnhancementInput,
  OutlineNodeEnhancementOutput,
  RuleCheckResult,
  SeedIgnitionInput,
  SeedIgnitionOutput,
  TheorySuggestion,
  UserPreference
} from "@/types/product";

export type TasteSample = {
  id: string;
  label: string;
  styleHint: string;
  text: string;
};

export type TasteChoice = {
  sampleId: string;
  liked: boolean;
};

export type LlmProvider = {
  generateTasteSamples: () => Promise<TasteSample[]>;
  analyzeTastePreference: (choices: TasteChoice[]) => Promise<UserPreference>;
  igniteSeed: (input: SeedIgnitionInput) => Promise<SeedIgnitionOutput>;
  enhanceOutlineNode: (input: OutlineNodeEnhancementInput) => Promise<OutlineNodeEnhancementOutput>;
  explainTheoryCheck: (result: RuleCheckResult) => Promise<TheorySuggestion>;
  extractSettingKeywords: (text: string) => Promise<string[]>;
};
