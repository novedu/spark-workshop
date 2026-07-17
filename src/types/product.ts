export type PacePreference = "fast" | "medium" | "slow";
export type PreferenceLevel = "high" | "medium" | "low";
export type StyleTendency = "feilu" | "qidian" | "fanqie" | "jinjiang" | "balanced";
export type IsoDateString = string;
export type SchemeType = "preference" | "contrast" | "brainhole";
export type RiskLevel = "low" | "medium" | "high";
export type ProjectSnapshotReason = "manualSave" | "aiGenerate" | "theoryFix";
export type EmotionType = "爽" | "虐" | "爽虐交织" | "温馨" | "悬疑";
export type TheoryId =
  | "T01"
  | "T02"
  | "T03"
  | "T04"
  | "T05"
  | "T06"
  | "T07"
  | "T08"
  | "T09"
  | "T10"
  | "T11"
  | "T12"
  | "T13"
  | "T14"
  | "T15"
  | "T16"
  | "T17"
  | "T18"
  | "T19"
  | "T20"
  | "T21"
  | "T22"
  | "T23"
  | "T24"
  | "T25"
  | "T26"
  | "T27"
  | "T28"
  | "T29"
  | "T30";

export type V1TheoryId = "T01" | "T02" | "T03" | "T04" | "T07" | "T11" | "T12" | "T13";

export type UserPreference = {
  pacePreference: PacePreference;
  infoGapTolerance: PreferenceLevel;
  emotionAmplitude: PreferenceLevel;
  styleTendency: StyleTendency;
};

export type WorldScheme = {
  id: string;
  type: SchemeType;
  title: string;
  tagline: string;
  coreConcept: string;
  powerSystem: string;
  conflictType: string;
  emotionCurve: string;
  similarSettingHints?: SimilarSettingHint[];
};

export type SeedIgnitionInput = {
  seedText: string;
  userPreference: UserPreference;
};

export type SeedIgnitionOutput = {
  schemes: WorldScheme[];
};

export type TheoryCategory =
  | "structure"
  | "rhythm"
  | "economy"
  | "psychology"
  | "conflict"
  | "innovation";

export type TheorySeverity = "pass" | "warning" | "fail";

export type TheoryDefinition = {
  id: TheoryId;
  category: TheoryCategory;
  academicName: string;
  plainName: string;
  coreIdea: string;
  aiRule: string;
};

export type TheoryCheckResult = {
  theoryId: TheoryId;
  severity: TheorySeverity;
  location: string;
  message: string;
  rescueOptions: string[];
};

export type SimilarSettingHint = {
  keyword: string;
  possibleTitles: string[];
  riskLevel: RiskLevel;
  suggestion: string;
};

export type OutlineNodeKind =
  | "world"
  | "protagonist"
  | "antagonist"
  | "goldenFinger"
  | "conflict"
  | "act"
  | "foreshadowing";

export type OutlineNode = {
  id: string;
  parentId?: string;
  kind: OutlineNodeKind;
  title: string;
  content: string;
  order: number;
  metadata?: Record<string, string | number | boolean | string[]>;
};

export type Project = {
  id: string;
  title: string;
  seedText: string;
  selectedScheme: WorldScheme;
  outlineNodes: OutlineNode[];
  theoryChecks: TheoryCheckResult[];
  similarSettingHints: SimilarSettingHint[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type ProjectSnapshot = {
  id: string;
  projectId: string;
  createdAt: IsoDateString;
  reason: ProjectSnapshotReason;
  data: Project;
};

export type RuleCheckResult = {
  theoryId: TheoryId;
  status: TheorySeverity;
  location: string;
  reason: string;
  evidence: string[];
};

export type TheorySuggestion = {
  theoryId: TheoryId;
  plainExplanation: string;
  theoryExplanation: string;
  suggestions: string[];
  canIgnore: boolean;
};

export type EmotionBeat = {
  id: string;
  label: string;
  chapterHint: string;
  emotion: EmotionType;
  intensity: 1 | 2 | 3 | 4 | 5;
};
