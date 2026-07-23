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

export type TheoryEvidenceSource = "outline" | "field" | "chapter" | "gap";

export type TheoryEvidence = {
  id: string;
  label: string;
  value: string;
  source: TheoryEvidenceSource;
  nodeId?: string;
  chapterNumber?: number;
};

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
  evidence?: TheoryEvidence[];
};

export type TheoryMatch = {
  theoryId: V1TheoryId;
  level: TheoryMatchLevel;
  severity?: TheorySeverity;
  location: string;
  reasons: TheoryMatchReason[];
  message: string;
  rescueOptions: string[];
  evidence: TheoryEvidence[];
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

export type ProtagonistMetadataKey =
  | "identity"
  | "coreDesire"
  | "openingPredicament"
  | "growthArc"
  | "keyRelationships";

export type ProtagonistMetadata = Partial<Record<ProtagonistMetadataKey, string>>;

export type PressureSourceMetadataKey =
  | "openingPressure"
  | "openingPressureStage"
  | "stageBoss"
  | "stageBossStage"
  | "systemPressure"
  | "systemPressureStage"
  | "finalOpponent"
  | "finalOpponentStage"
  | "pressureEscalation";

export type PressureSourceMetadata = Partial<Record<PressureSourceMetadataKey, string>>;

export type GoldenFingerMetadataKey =
  | "abilityCore"
  | "limitation"
  | "cost"
  | "upgradePath"
  | "backlashRisk";

export type GoldenFingerMetadata = Partial<Record<GoldenFingerMetadataKey, string>>;

export type OutlineNodeMetadata = SerialArcMetadata &
  ArcPhaseMetadata &
  ProtagonistMetadata &
  PressureSourceMetadata &
  GoldenFingerMetadata &
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
  worldState?: ProjectWorldState;
  openingChapterPlan?: OpeningChapterPlan;
  openingChapterDrafts?: OpeningChapterDraftSet;
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

export type WorldStateVersion = 1;

export type WorldStateEntityKind =
  | "character"
  | "faction"
  | "location"
  | "item"
  | "ability"
  | "rule"
  | "other";

export type WorldStateEntityStatus = "active" | "inactive" | "unknown";

export type WorldStateRelationType =
  | "ally"
  | "enemy"
  | "belongsTo"
  | "teacherStudent"
  | "family"
  | "rival"
  | "debt"
  | "other";

export type WorldStateRelationStatus = "active" | "ended" | "unknown";

export type WorldStateForeshadowingStatus = "open" | "resolved" | "abandoned";

export type WorldStateEventKind =
  | "stateChange"
  | "relationChange"
  | "foreshadowingPlanted"
  | "foreshadowingResolved";

export type WorldStateEventStatus = "planned" | "confirmed" | "retracted";

export type WorldStateSource = {
  nodeId?: string;
  chapterRange?: string;
  label?: string;
};

export type WorldStateEntity = {
  id: string;
  kind: WorldStateEntityKind;
  name: string;
  summary: string;
  currentState: string;
  status: WorldStateEntityStatus;
  aliases?: string[];
  source?: WorldStateSource;
  updatedAt: IsoDateString;
};

export type WorldStateRelation = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relationType: WorldStateRelationType;
  relationLabel?: string;
  status: WorldStateRelationStatus;
  summary: string;
  source?: WorldStateSource;
  updatedAt: IsoDateString;
};

export type WorldStateForeshadowing = {
  id: string;
  title: string;
  summary: string;
  status: WorldStateForeshadowingStatus;
  triggerCondition?: string;
  plannedPayoff?: string;
  relatedEntityIds?: string[];
  source?: WorldStateSource;
  targetNodeId?: string;
  updatedAt: IsoDateString;
};

export type WorldStateEvent = {
  id: string;
  kind: WorldStateEventKind;
  status: WorldStateEventStatus;
  summary: string;
  entityId?: string;
  relatedEntityIds?: string[];
  fromState?: string;
  toState?: string;
  source?: WorldStateSource;
  createdAt: IsoDateString;
};

export type ProjectWorldState = {
  version: WorldStateVersion;
  currentArcPhaseId?: string;
  entities: WorldStateEntity[];
  relations: WorldStateRelation[];
  foreshadowings: WorldStateForeshadowing[];
  events: WorldStateEvent[];
  updatedAt: IsoDateString;
};

export type OpeningChapterPlanVersion = 1;

export type OpeningChapterPlanChapter = {
  chapterNumber: number;
  title: string;
  arcPhaseId?: string;
  readerQuestion: string;
  sceneTask: string;
  pressureOrPayoff: string;
  chapterHook: string;
  requiredFactIds: string[];
  stateChange: string;
  notes?: string;
};

export type OpeningChapterPlan = {
  version: OpeningChapterPlanVersion;
  chapterRange: "1-30";
  sourceActId?: string;
  chapters: OpeningChapterPlanChapter[];
  updatedAt: IsoDateString;
};

export type OpeningChapterDraftSetVersion = 1;
export type OpeningChapterDraftNumber = 1 | 2 | 3;
export type OpeningChapterDraftStatus = "empty" | "draft" | "confirmed";
export type OpeningChapterDraftOrigin = "author" | "llm" | "hybrid" | "local-scaffold";
export type OpeningChapterDraftStateChangeStatus = "pending" | "confirmed" | "retracted";

export type OpeningChapterDraft = {
  chapterNumber: OpeningChapterDraftNumber;
  title: string;
  content: string;
  status: OpeningChapterDraftStatus;
  origin: OpeningChapterDraftOrigin;
  sourcePlanSignature?: string;
  usedFactIds: string[];
  stateChangeStatus: OpeningChapterDraftStateChangeStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type OpeningChapterDraftSet = {
  version: OpeningChapterDraftSetVersion;
  chapterRange: "1-3";
  chapters: OpeningChapterDraft[];
  updatedAt: IsoDateString;
};

export type OpeningChapterPlanGenerationInput = {
  outlineNodes: OutlineNode[];
  openingChapterPlan?: OpeningChapterPlan;
};

export type OpeningChapterPlanGenerationOutput = {
  openingChapterPlan: OpeningChapterPlan;
  suggestions: string[];
  llmMeta?: LlmResultMeta;
};

export type OpeningChapterDraftContextFactKind = "entity" | "relation" | "foreshadowing" | "event";

export type OpeningChapterDraftContextFact = {
  id: string;
  kind: OpeningChapterDraftContextFactKind;
  label: string;
  summary: string;
  state?: string;
  status?: string;
};

export type OpeningChapterDraftGenerationInput = {
  projectTitle: string;
  seedText: string;
  chapterNumber: OpeningChapterDraftNumber;
  selectedScheme: Pick<
    WorldScheme,
    "title" | "tagline" | "storyHook" | "premise" | "storyEngine" | "coreConcept" | "powerSystem" | "conflictType"
  >;
  currentChapter: OpeningChapterPlanChapter;
  protagonistSummary?: {
    identity?: string;
    coreDesire?: string;
    openingPredicament?: string;
    growthArc?: string;
    keyRelationships?: string;
  };
  pressureSourceSummary: Array<{
    label: string;
    value: string;
    stageValue?: string;
  }>;
  goldenFingerSummary: Array<{
    label: string;
    value: string;
  }>;
  requiredFacts: OpeningChapterDraftContextFact[];
  confirmedEvents: Array<{
    id: string;
    summary: string;
    relatedEntityIds?: string[];
    chapterRange?: string;
  }>;
  previousChapter?: {
    chapterNumber: OpeningChapterDraftNumber;
    title: string;
    endingExcerpt: string;
    continuityNote?: string;
  };
};

export type OpeningChapterDraftGenerationContextSummary = {
  factIds: string[];
  confirmedEventIds: string[];
  previousChapterNumber?: OpeningChapterDraftNumber;
  fieldGroups: string[];
};

export type OpeningChapterDraftGenerationOutput = {
  title: string;
  content: string;
  contextSummary: OpeningChapterDraftGenerationContextSummary;
  llmMeta?: LlmResultMeta;
};

export type OpeningChapterGapId = "length" | "hook" | "pressure" | "state-change";

export type OpeningChapterGapFillInput = OpeningChapterDraftGenerationInput & {
  gap: {
    id: OpeningChapterGapId;
    label: string;
    message: string;
  };
  draftContext: {
    title: string;
    beforeSelection: string;
    selectedText: string;
    afterSelection: string;
  };
};

export type OpeningChapterGapFillOutput = {
  content: string;
  contextSummary: OpeningChapterDraftGenerationContextSummary & {
    gapId: OpeningChapterGapId;
  };
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
