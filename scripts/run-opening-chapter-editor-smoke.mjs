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

const {
  checkOpeningChapterDraft,
  getOpeningChapterDraftCheckCounts,
  getOpeningChapterDraftStats
} = require("../src/lib/opening-chapter-draft-checks.ts");
const {
  ensureOpeningChapterDrafts,
  isOpeningChapterDraftStale
} = require("../src/lib/opening-chapter-drafts.ts");
const { createOpeningChapterPlan } = require("../src/lib/opening-chapter-plan.ts");
const { createOutlineFromScheme } = require("../src/lib/outline-template.ts");

const scheme = {
  id: "opening-editor-scheme",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  coreConcept: "记忆是城市硬通货。",
  powerSystem: "读取记忆残片会换来短暂能力。",
  conflictType: "主角要夺回母亲被清空的人生记录。",
  emotionCurve: "压迫 -> 反击 -> 新危机",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(scheme);
const basePlan = createOpeningChapterPlan(outlineNodes, "2026-07-20T00:00:00.000Z");
const plan = {
  ...basePlan,
  chapters: basePlan.chapters.map((chapter) => chapter.chapterNumber === 1
    ? {
        ...chapter,
        pressureOrPayoff: "记忆税封条逼近母亲档案",
        stateChange: "沈砚决定追查旧账本",
        chapterHook: "旧账本出现母亲名字",
        requiredFactIds: ["protagonist-main", "pressure-opening"]
      }
    : chapter)
};
const emptyDrafts = ensureOpeningChapterDrafts({ openingChapterPlan: plan, updatedAt: plan.updatedAt });
const emptyChecks = checkOpeningChapterDraft({
  draft: emptyDrafts.chapters[0],
  drafts: emptyDrafts,
  plan,
  knownFactIds: ["protagonist-main", "pressure-opening"]
});

const paragraph = "沈砚站在记忆税务所门前，记忆税封条正逼近母亲档案。他没有后退，反而把每一个编号都记了下来。";
const fullContent = Array.from({ length: 36 }, (_, index) => `${paragraph}这是第${index + 1}次确认。`).join("\n")
  + "\n沈砚决定追查旧账本。可就在这时，他竟然发现旧账本上出现了母亲的名字。";
const editedDrafts = {
  ...emptyDrafts,
  chapters: emptyDrafts.chapters.map((chapter) => chapter.chapterNumber === 1
    ? { ...chapter, content: fullContent, status: "draft", updatedAt: "2026-07-20T00:05:00.000Z" }
    : chapter)
};
const fullChecks = checkOpeningChapterDraft({
  draft: editedDrafts.chapters[0],
  drafts: editedDrafts,
  plan,
  knownFactIds: ["protagonist-main", "pressure-opening"]
});
const changedPlan = {
  ...plan,
  chapters: plan.chapters.map((chapter) => chapter.chapterNumber === 1
    ? { ...chapter, chapterHook: "税务长当场叫出沈砚的真名" }
    : chapter)
};

const componentSource = fs.readFileSync(path.join(root, "src/components/OpeningChapterDraftEditor.tsx"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");

const checks = [
  {
    id: "empty-draft-blocked-locally",
    passed: getOpeningChapterDraftCheckCounts(emptyChecks).blockers === 1 && emptyChecks.some((check) => check.id === "length"),
    detail: JSON.stringify(getOpeningChapterDraftCheckCounts(emptyChecks))
  },
  {
    id: "full-draft-signals-pass",
    passed:
      getOpeningChapterDraftStats(fullContent).characterCount >= 1800 &&
      ["hook", "pressure", "state-change"].every((id) => fullChecks.find((check) => check.id === id)?.tone === "pass"),
    detail: JSON.stringify(fullChecks.filter((check) => ["hook", "pressure", "state-change"].includes(check.id)))
  },
  {
    id: "plan-change-keeps-draft-stale",
    passed: isOpeningChapterDraftStale(editedDrafts.chapters[0], changedPlan) && editedDrafts.chapters[0].content === fullContent,
    detail: `characters=${getOpeningChapterDraftStats(editedDrafts.chapters[0].content).characterCount}`
  },
  {
    id: "editor-ui-hooks",
    passed:
      componentSource.includes("aria-label=\"前三章正文试写\"") &&
      componentSource.includes("本地检查") &&
      componentSource.includes("已核对当前计划") &&
      workbenchSource.includes("handleOpeningChapterDraftsChange") &&
      workbenchSource.includes("OpeningChapterDraftEditor"),
    detail: "Three-chapter editor, stale-plan acknowledgement and workbench integration are present"
  },
  {
    id: "auto-save-and-layout-hooks",
    passed:
      workbenchSource.includes("Opening chapter draft auto-save failed") &&
      workbenchSource.includes("}, 900)") &&
      cssSource.includes(".opening-draft-workspace") &&
      cssSource.includes(".opening-draft-checks") &&
      packageSource.includes("acceptance:opening-editor"),
    detail: "Debounced local persistence, bounded checks panel and acceptance command are present"
  }
];

console.table(checks);
const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
