export type PacePreference = "fast" | "medium" | "slow";
export type PreferenceLevel = "high" | "medium" | "low";
export type StyleTendency = "feilu" | "qidian" | "fanqie" | "jinjiang" | "balanced";
export type IsoDateString = string;
export type SchemeType = "preference" | "contrast" | "brainhole";
export type RiskLevel = "low" | "medium" | "high";
export type ProjectSnapshotReason = "manualSave" | "aiGenerate" | "theoryFix";
export type EmotionType = "爽" | "虐" | "爽虐交织" | "温馨" | "悬疑" | "期待" | "紧张" | "心疼" | "好奇" | "压迫" | "热血";
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
  storyHook?: string;
  premise?: string;
  storyEngine?: string;
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
  llmMeta?: LlmResultMeta;
};

export type LlmResultMeta = {
  source: "llm" | "mock" | "cache";
  fallbackReason?: string;
};

export type TheoryCategory =
  | "structure"
  | "rhythm"
  | "economy"
  | "psychology"
  | "conflict"
  | "innovation";

export type TheorySeverity = "pass" | "warning" | "fail";
export type TheoryMatchLevel = "needs_fix" | "suggest_check" | "hidden";
export type TheoryMatchReason =
  | "rule_fail"
  | "rule_warning"
  | "node_relevant"
  | "keyword_hit"
  | "content_gap";

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

export type TheoryMatch = {
  theoryId: V1TheoryId;
  level: TheoryMatchLevel;
  severity?: TheorySeverity;
  location: string;
  reasons: TheoryMatchReason[];
  message: string;
  rescueOptions: string[];
  score: number;
};

export type TheorySuggestionStateKind = "ignored" | "resolved";

export type TheorySuggestionState = {
  theoryId: V1TheoryId;
  state: TheorySuggestionStateKind;
  updatedAt: IsoDateString;
  nodeId?: string;
  contentSignature?: string;
  checkSignature?: string;
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
  | "arcPhase"
  | "foreshadowing";

export type SerialArcMetadataKey =
  | "chapterRange"
  | "volumeGoal"
  | "mapLayer"
  | "pressureSource"
  | "upgradeResource"
  | "miniClimax"
  | "nextVolumeHook";

export type SerialArcMetadata = Partial<Record<SerialArcMetadataKey, string>>;

export type ArcPhaseRole = "setup" | "pressure" | "turning" | "payoff" | "hook";

export type ArcPhaseMetadataKey =
  | "phaseRole"
  | "readerQuestion"
  | "pressureSource"
  | "payoffBeat"
  | "chapterHook"
  | "stateChange";

export type ArcPhaseMetadata = Partial<Record<ArcPhaseMetadataKey, string>> & {
  chapterRange?: string;
};

export type OutlineNodeMetadata = SerialArcMetadata &
  ArcPhaseMetadata &
  Record<string, string | number | boolean | string[] | undefined>;

export type OutlineNode = {
  id: string;
  parentId?: string;
  kind: OutlineNodeKind;
  title: string;
  content: string;
  emotionGoal?: ReaderEmotionGoal;
  order: number;
  metadata?: OutlineNodeMetadata;
};

export type Project = {
  id: string;
  title: string;
  seedText: string;
  selectedScheme: WorldScheme;
  outlineNodes: OutlineNode[];
  theoryChecks: TheoryCheckResult[];
  theorySuggestionStates?: Record<string, TheorySuggestionState>;
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
  llmMeta?: LlmResultMeta;
};

export type OutlineNodeEnhancementInput = {
  node: OutlineNode;
  outlineNodes: OutlineNode[];
};

export type OutlineNodeEnhancementOutput = {
  content: string;
  suggestions: string[];
  llmMeta?: LlmResultMeta;
};

export type EmotionBeat = {
  id: string;
  label: string;
  chapterHint: string;
  emotion: EmotionType;
  intensity: 1 | 2 | 3 | 4 | 5;
};

export type ReaderEmotionGoal = {
  emotion: EmotionType;
  promise: string;
  intensity: 1 | 2 | 3 | 4 | 5;
};
