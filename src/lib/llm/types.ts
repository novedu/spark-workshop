import type {
  OpeningChapterGapFillInput,
  OpeningChapterGapFillOutput,
  OpeningChapterDraftGenerationInput,
  OpeningChapterDraftGenerationOutput,
  OutlineNodeEnhancementInput,
  OutlineNodeEnhancementOutput,
  OpeningChapterPlanGenerationInput,
  OpeningChapterPlanGenerationOutput,
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
  generateOpeningChapterPlan: (input: OpeningChapterPlanGenerationInput) => Promise<OpeningChapterPlanGenerationOutput>;
  generateOpeningChapterDraft: (input: OpeningChapterDraftGenerationInput) => Promise<OpeningChapterDraftGenerationOutput>;
  fillOpeningChapterGap: (input: OpeningChapterGapFillInput) => Promise<OpeningChapterGapFillOutput>;
  explainTheoryCheck: (result: RuleCheckResult) => Promise<TheorySuggestion>;
  extractSettingKeywords: (text: string) => Promise<string[]>;
};
