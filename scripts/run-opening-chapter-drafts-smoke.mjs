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

const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");
const {
  ensureOpeningChapterDrafts,
  getOpeningChapterDraftCounts,
  isOpeningChapterDraftStale
} = require("../src/lib/opening-chapter-drafts.ts");
const { createOpeningChapterPlan } = require("../src/lib/opening-chapter-plan.ts");
const { createOutlineFromScheme } = require("../src/lib/outline-template.ts");
const { ensureWorldState } = require("../src/lib/world-state.ts");

const sampleScheme = {
  id: "opening-draft-scheme",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  coreConcept: "记忆是城市硬通货。",
  powerSystem: "读取记忆残片会换来短暂能力。",
  conflictType: "主角要夺回母亲被清空的人生记录。",
  emotionCurve: "压迫 -> 反击 -> 新危机",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(sampleScheme);
const openingChapterPlan = createOpeningChapterPlan(outlineNodes, "2026-07-20T00:00:00.000Z");
const emptyDrafts = ensureOpeningChapterDrafts({
  openingChapterPlan,
  updatedAt: "2026-07-20T00:00:00.000Z"
});

const editedDrafts = ensureOpeningChapterDrafts({
  openingChapterPlan,
  openingChapterDrafts: {
    version: 1,
    chapterRange: "1-3",
    updatedAt: "2026-07-20T00:10:00.000Z",
    chapters: [
      {
        chapterNumber: 1,
        title: "第1章：记忆税务所门前",
        content: "沈砚站在记忆税务所门前，看见母亲的档案被盖上欠税封条。",
        status: "confirmed",
        origin: "author",
        sourcePlanSignature: emptyDrafts.chapters[0].sourcePlanSignature,
        usedFactIds: ["protagonist-main", "pressure-opening"],
        stateChangeStatus: "confirmed",
        createdAt: "2026-07-20T00:05:00.000Z",
        updatedAt: "2026-07-20T00:10:00.000Z"
      }
    ]
  },
  updatedAt: "2026-07-20T00:10:00.000Z"
});

const changedOpeningChapterPlan = {
  ...openingChapterPlan,
  chapters: openingChapterPlan.chapters.map((chapter) =>
    chapter.chapterNumber === 1
      ? {
          ...chapter,
          chapterHook: "税务旧账本突然显示母亲档案曾被调包。"
        }
      : chapter
  )
};
const draftsAfterPlanChange = ensureOpeningChapterDrafts({
  openingChapterPlan: changedOpeningChapterPlan,
  openingChapterDrafts: editedDrafts,
  updatedAt: "2026-07-20T00:12:00.000Z"
});

const project = {
  id: "opening-draft-project",
  title: sampleScheme.title,
  seedText: "记忆税",
  selectedScheme: sampleScheme,
  outlineNodes,
  openingChapterPlan: changedOpeningChapterPlan,
  openingChapterDrafts: draftsAfterPlanChange,
  worldState: ensureWorldState({
    outlineNodes,
    openingChapterPlan: changedOpeningChapterPlan,
    updatedAt: "2026-07-20T00:12:00.000Z"
  }),
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:12:00.000Z"
};
const snapshotClone = JSON.parse(
  JSON.stringify({
    id: "opening-draft-snapshot",
    projectId: project.id,
    createdAt: "2026-07-20T00:13:00.000Z",
    reason: "manualSave",
    data: project
  })
);
const markdown = buildProjectMarkdown(project);
const typeSource = fs.readFileSync(path.join(root, "src/types/product.ts"), "utf8");
const storageSource = fs.readFileSync(path.join(root, "src/lib/storage.ts"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");

const checks = [
  {
    id: "default-three-draft-slots",
    passed: emptyDrafts.chapters.length === 3 && emptyDrafts.chapters.every((chapter) => chapter.status === "empty"),
    detail: JSON.stringify(getOpeningChapterDraftCounts(emptyDrafts))
  },
  {
    id: "author-draft-preserved",
    passed:
      editedDrafts.chapters[0].content.includes("记忆税务所门前") &&
      editedDrafts.chapters[0].status === "confirmed" &&
      editedDrafts.chapters[0].stateChangeStatus === "confirmed",
    detail: JSON.stringify(editedDrafts.chapters[0])
  },
  {
    id: "plan-change-marks-existing-draft-stale",
    passed:
      isOpeningChapterDraftStale(draftsAfterPlanChange.chapters[0], changedOpeningChapterPlan) &&
      !isOpeningChapterDraftStale(draftsAfterPlanChange.chapters[1], changedOpeningChapterPlan),
    detail: draftsAfterPlanChange.chapters.map((chapter) => `${chapter.chapterNumber}:${chapter.sourcePlanSignature}`).join(" | ")
  },
  {
    id: "project-and-snapshot-preserve-drafts",
    passed:
      project.openingChapterDrafts.chapters[0].content === snapshotClone.data.openingChapterDrafts.chapters[0].content &&
      snapshotClone.data.openingChapterDrafts.chapters.length === 3,
    detail: JSON.stringify(snapshotClone.data.openingChapterDrafts.chapters[0])
  },
  {
    id: "markdown-exports-drafts",
    passed:
      markdown.includes("## 前三章正文草稿") &&
      markdown.includes("正文基于旧计划") &&
      markdown.includes("沈砚站在记忆税务所门前"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "drafts-do-not-create-confirmed-world-events",
    passed: project.worldState.events.every((event) => event.status !== "confirmed"),
    detail: `events=${project.worldState.events.length}`
  },
  {
    id: "persistence-hooks",
    passed:
      typeSource.includes("openingChapterDrafts?: OpeningChapterDraftSet") &&
      storageSource.includes("ensureOpeningChapterDrafts") &&
      workbenchSource.includes("setOpeningChapterDrafts"),
    detail: "Project type, storage normalization and workbench save/restore paths include openingChapterDrafts"
  }
];

console.table(checks);

const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
