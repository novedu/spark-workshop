import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";

const root = process.cwd();
const require = Module.createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename(path.join(root, "src", request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename(request, parent, isMain, options);
};

Module._extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText;
  module._compile(output, filename);
};

const { createOutlineFromScheme } = require("../src/lib/outline-template.ts");
const { ensureOpeningChapterPlan } = require("../src/lib/opening-chapter-plan.ts");
const {
  ensureOpeningChapterDrafts,
  getOpeningChapterPlanSignature
} = require("../src/lib/opening-chapter-drafts.ts");
const {
  applyOpeningChapterGapCandidate,
  buildOpeningChapterDraftGenerationInput,
  buildOpeningChapterGapFillInput
} = require("../src/lib/opening-chapter-generation.ts");
const { checkOpeningChapterDraft } = require("../src/lib/opening-chapter-draft-checks.ts");
const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");
const {
  ensureWorldState,
  upsertOpeningChapterStateEvent
} = require("../src/lib/world-state.ts");

const scheme = {
  id: "v2-trial-1-memory-tax",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "税务所门口，主角看到母亲的记忆被贴上欠税封条。",
  premise: "底层少年必须夺回母亲的人生记录，才有资格进入内城。",
  storyEngine: "每次破局都要拿自己的记忆和关系去换。",
  coreConcept: "记忆是城市唯一合法流通的硬通货。",
  powerSystem: "读取记忆残片换来短时能力，代价是失去真实经历。",
  conflictType: "主角要对抗记忆税务体系和其背后的旧势力。",
  emotionCurve: "压迫 -> 反击 -> 更大代价",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(scheme);
const timestamp = "2026-07-20T00:00:00.000Z";
const openingChapterPlan = ensureOpeningChapterPlan({ outlineNodes, updatedAt: timestamp });
const openingChapterDrafts = ensureOpeningChapterDrafts({ openingChapterPlan, updatedAt: timestamp });
const chapter1 = openingChapterPlan.chapters.find((chapter) => chapter.chapterNumber === 1);
const chapter2 = openingChapterPlan.chapters.find((chapter) => chapter.chapterNumber === 2);
const chapter3 = openingChapterPlan.chapters.find((chapter) => chapter.chapterNumber === 3);
if (!chapter1 || !chapter2 || !chapter3) throw new Error("Trial fixture needs the first three chapter plans.");

const longOpening = Array.from({ length: 12 }, (_, index) =>
  `沈砚第${index + 1}次抬头看向欠税榜，管事仍在众目睽睽之下催他交出母亲最后一段记忆。`
).join("\n\n") + "\n\n下一刻，铜钟突然响起，封条上的黑字开始渗血。";
const trialDrafts = {
  ...openingChapterDrafts,
  chapters: openingChapterDrafts.chapters.map((draft) => draft.chapterNumber === 1
    ? {
        ...draft,
        title: chapter1.title,
        content: longOpening,
        status: "draft",
        sourcePlanSignature: getOpeningChapterPlanSignature(chapter1),
        usedFactIds: chapter1.requiredFactIds,
        updatedAt: "2026-07-20T00:01:00.000Z"
      }
    : draft.chapterNumber === 2
      ? {
          ...draft,
          title: chapter2.title,
          content: "沈砚带着裂开的旧账本走进后巷，上一章的铜钟声仍在耳边回响。",
          status: "draft",
          sourcePlanSignature: getOpeningChapterPlanSignature(chapter2),
          usedFactIds: chapter2.requiredFactIds,
          updatedAt: "2026-07-20T00:02:00.000Z"
        }
      : draft.chapterNumber === 3
        ? {
            ...draft,
            title: chapter3.title,
            content: "第三章的正文先保留给作者继续试写。",
            status: "draft",
            sourcePlanSignature: getOpeningChapterPlanSignature(chapter3),
            usedFactIds: chapter3.requiredFactIds,
            updatedAt: "2026-07-20T00:03:00.000Z"
          }
        : draft)
};

const baseProject = {
  id: "v2-trial-1-project",
  title: scheme.title,
  seedText: "记忆税",
  selectedScheme: scheme,
  outlineNodes,
  openingChapterPlan,
  openingChapterDrafts: trialDrafts,
  worldState: ensureWorldState({ outlineNodes, openingChapterPlan, updatedAt: timestamp }, timestamp),
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: timestamp,
  updatedAt: timestamp
};

const chapter1Checks = checkOpeningChapterDraft({
  draft: trialDrafts.chapters.find((draft) => draft.chapterNumber === 1),
  drafts: trialDrafts,
  plan: openingChapterPlan,
  knownFactIds: ["protagonist-main", "pressure-opening"]
});

const confirmedWorldState = upsertOpeningChapterStateEvent(
  baseProject.worldState,
  chapter1,
  "confirmed",
  "2026-07-20T00:10:00.000Z"
);
const confirmedDrafts = {
  ...trialDrafts,
  chapters: trialDrafts.chapters.map((draft) => draft.chapterNumber === 1
    ? { ...draft, status: "confirmed", stateChangeStatus: "confirmed" }
    : draft)
};
const confirmedProject = {
  ...baseProject,
  openingChapterDrafts: confirmedDrafts,
  worldState: confirmedWorldState
};

const chapter2Context = buildOpeningChapterDraftGenerationInput(confirmedProject, 2);
const gapInput = buildOpeningChapterGapFillInput(
  confirmedProject,
  2,
  { id: "hook", label: "章末追读", message: "需要一个更明确的章末追读点。" },
  confirmedProject.openingChapterDrafts.chapters[1].content.length,
  confirmedProject.openingChapterDrafts.chapters[1].content.length
);
const patchedChapter2 = applyOpeningChapterGapCandidate(
  confirmedProject.openingChapterDrafts.chapters[1].content,
  "巷口有人喊出了他的名字，而那声音来自三年前已经死去的人。",
  confirmedProject.openingChapterDrafts.chapters[1].content.length,
  confirmedProject.openingChapterDrafts.chapters[1].content.length
);
const hybridDrafts = {
  ...confirmedDrafts,
  chapters: confirmedDrafts.chapters.map((draft) => draft.chapterNumber === 2
    ? { ...draft, content: patchedChapter2, origin: "hybrid" }
    : draft)
};
const markdown = buildProjectMarkdown({ ...confirmedProject, openingChapterDrafts: hybridDrafts });

const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src/components/OpeningChapterDraftEditor.tsx"), "utf8");
const providerSource = fs.readFileSync(path.join(root, "src/lib/llm/client-provider.ts"), "utf8");

const checks = [
  {
    id: "chapter-1-local-checks-run",
    passed: chapter1Checks.length === 8 && chapter1Checks.some((check) => check.id === "hook"),
    detail: `${chapter1Checks.length} local checks`
  },
  {
    id: "chapter-1-confirmation-feeds-chapter-2",
    passed:
      confirmedWorldState.events.some((event) => event.id === "opening-chapter-state-1" && event.status === "confirmed") &&
      chapter2Context.confirmedEvents.some((event) => event.id === "opening-chapter-state-1"),
    detail: JSON.stringify(chapter2Context.confirmedEvents)
  },
  {
    id: "chapter-2-gap-context-is-bounded",
    passed:
      gapInput.gap.id === "hook" &&
      gapInput.draftContext.beforeSelection.length <= 1200 &&
      gapInput.draftContext.afterSelection.length === 0,
    detail: JSON.stringify(gapInput.draftContext)
  },
  {
    id: "gap-apply-keeps-hybrid-provenance",
    passed: hybridDrafts.chapters.find((draft) => draft.chapterNumber === 2)?.origin === "hybrid" &&
      patchedChapter2.includes("三年前已经死去的人"),
    detail: hybridDrafts.chapters.find((draft) => draft.chapterNumber === 2)?.origin
  },
  {
    id: "save-export-preserves-trial-state",
    passed:
      markdown.includes("作者 + AI 补写") &&
      markdown.includes("状态变化确认：已确认") &&
      markdown.includes("### 第 2 章正文"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "trial-flow-wiring-present",
    passed:
      workbenchSource.includes("handleGenerateOpeningChapterDraft") &&
      workbenchSource.includes("handleFillOpeningChapterGap") &&
      workbenchSource.includes("handleConfirmOpeningChapterDraft") &&
      workbenchSource.includes("saveSnapshot") &&
      editorSource.includes("采纳到正文") &&
      providerSource.includes('startAiRun("fillOpeningChapterGap")'),
    detail: "three-chapter actions, snapshot, apply and run telemetry are wired"
  }
];

console.table(checks);
const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
