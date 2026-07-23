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
const { ensureOpeningChapterDrafts } = require("../src/lib/opening-chapter-drafts.ts");
const { buildOpeningChapterDraftGenerationInput } = require("../src/lib/opening-chapter-generation.ts");
const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");
const {
  ensureWorldState,
  queryWorldState,
  upsertOpeningChapterStateEvent
} = require("../src/lib/world-state.ts");

const scheme = {
  id: "opening-confirmation-scheme",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "税务所门口，主角看到母亲记忆被贴上欠税封条。",
  premise: "主角必须夺回母亲的人生记录，才有资格进入内城。",
  storyEngine: "每次破局都要拿自己的记忆和关系去换。",
  coreConcept: "记忆是城市唯一合法流通的硬通货。",
  powerSystem: "读取记忆残片换来短时能力，代价是失去真实经历。",
  conflictType: "主角要对抗记忆税务体系和其背后的旧势力。",
  emotionCurve: "压迫 -> 反击 -> 更大代价",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(scheme);
const openingChapterPlan = ensureOpeningChapterPlan({
  outlineNodes,
  updatedAt: "2026-07-20T00:00:00.000Z"
});
const drafts = ensureOpeningChapterDrafts({
  openingChapterPlan,
  openingChapterDrafts: {
    version: 1,
    chapterRange: "1-3",
    updatedAt: "2026-07-20T00:00:00.000Z",
    chapters: [
      {
        chapterNumber: 1,
        title: "第1章：税务所门前",
        content: [
          "沈砚站在记忆税务所门口，母亲的名字被钉在欠税榜最上方。",
          "他第一次没有低头，而是当众记下了所有负责封档的人。"
        ].join("\n"),
        status: "draft",
        origin: "author",
        sourcePlanSignature: "",
        usedFactIds: ["protagonist-main", "pressure-opening"],
        stateChangeStatus: "pending",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z"
      },
      {
        chapterNumber: 2,
        title: "第2章：账本裂缝",
        content: "",
        status: "empty",
        origin: "author",
        sourcePlanSignature: "",
        usedFactIds: [],
        stateChangeStatus: "pending",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z"
      },
      {
        chapterNumber: 3,
        title: "第3章：待试写",
        content: "",
        status: "empty",
        origin: "author",
        sourcePlanSignature: "",
        usedFactIds: [],
        stateChangeStatus: "pending",
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z"
      }
    ]
  },
  updatedAt: "2026-07-20T00:00:00.000Z"
});

const chapter1 = openingChapterPlan.chapters.find((chapter) => chapter.chapterNumber === 1);
const chapter2 = openingChapterPlan.chapters.find((chapter) => chapter.chapterNumber === 2);
if (!chapter1 || !chapter2) {
  throw new Error("Expected opening chapter plan to include chapter 1 and 2.");
}

const baseProject = {
  id: "opening-confirmation-project",
  title: "记忆税城",
  seedText: "记忆税",
  selectedScheme: scheme,
  outlineNodes,
  openingChapterPlan,
  openingChapterDrafts: drafts,
  worldState: ensureWorldState({
    outlineNodes,
    openingChapterPlan,
    updatedAt: "2026-07-20T00:00:00.000Z"
  }, "2026-07-20T00:00:00.000Z"),
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z"
};

const confirmedWorldState = upsertOpeningChapterStateEvent(
  baseProject.worldState,
  chapter1,
  "confirmed",
  "2026-07-20T00:10:00.000Z"
);
const confirmedDrafts = {
  ...drafts,
  updatedAt: "2026-07-20T00:10:00.000Z",
  chapters: drafts.chapters.map((draft) =>
    draft.chapterNumber === 1
      ? {
          ...draft,
          status: "confirmed",
          stateChangeStatus: "confirmed",
          updatedAt: "2026-07-20T00:10:00.000Z"
        }
      : draft
  )
};
const projectAfterConfirmation = {
  ...baseProject,
  openingChapterDrafts: confirmedDrafts,
  worldState: confirmedWorldState,
  updatedAt: "2026-07-20T00:10:00.000Z"
};

const chapter2GenerationInput = buildOpeningChapterDraftGenerationInput(projectAfterConfirmation, 2);
const retractedWorldState = upsertOpeningChapterStateEvent(
  confirmedWorldState,
  chapter1,
  "retracted",
  "2026-07-20T00:20:00.000Z"
);
const markdown = buildProjectMarkdown(projectAfterConfirmation);
const queriedConfirmedEvents = queryWorldState(confirmedWorldState, {
  eventStatuses: ["confirmed"]
});

const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src/components/OpeningChapterDraftEditor.tsx"), "utf8");
const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");

const checks = [
  {
    id: "confirm-promotes-opening-event",
    passed:
      confirmedWorldState.events.some(
        (event) =>
          event.id === "opening-chapter-state-1" &&
          event.status === "confirmed" &&
          event.summary === chapter1.stateChange
      ),
    detail: JSON.stringify(confirmedWorldState.events.find((event) => event.id === "opening-chapter-state-1"))
  },
  {
    id: "confirmed-event-enters-next-chapter-context",
    passed:
      chapter2GenerationInput.confirmedEvents.some((event) => event.id === "opening-chapter-state-1") &&
      chapter2GenerationInput.previousChapter?.chapterNumber === 1,
    detail: JSON.stringify({
      confirmedEventIds: chapter2GenerationInput.confirmedEvents.map((event) => event.id),
      previousChapterNumber: chapter2GenerationInput.previousChapter?.chapterNumber
    })
  },
  {
    id: "editing-can-retract-confirmed-event",
    passed:
      retractedWorldState.events.some(
        (event) => event.id === "opening-chapter-state-1" && event.status === "retracted"
      ) &&
      queryWorldState(retractedWorldState, { eventStatuses: ["confirmed"] }).events.every(
        (event) => event.id !== "opening-chapter-state-1"
      ),
    detail: JSON.stringify(retractedWorldState.events.find((event) => event.id === "opening-chapter-state-1"))
  },
  {
    id: "markdown-preserves-confirmation-state",
    passed:
      markdown.includes("### 第 1 章正文") &&
      markdown.includes("状态：已确认") &&
      markdown.includes("状态变化确认：已确认") &&
      markdown.includes("opening-chapter-state-1") === false &&
      markdown.includes(chapter1.stateChange),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "ui-wires-confirm-action",
    passed:
      workbenchSource.includes("handleConfirmOpeningChapterDraft") &&
      workbenchSource.includes("upsertOpeningChapterStateEvent") &&
      editorSource.includes("确认当前章") &&
      editorSource.includes("onConfirm") &&
      packageSource.includes("acceptance:opening-confirmation"),
    detail: "workbench, editor and script hook into chapter confirmation"
  },
  {
    id: "confirmed-query-visible",
    passed:
      queriedConfirmedEvents.events.some((event) => event.id === "opening-chapter-state-1") &&
      queriedConfirmedEvents.events.every((event) => event.status === "confirmed"),
    detail: JSON.stringify(queriedConfirmedEvents.events.map((event) => ({ id: event.id, status: event.status })))
  }
];

console.table(checks);
const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
