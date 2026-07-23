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
const {
  applyOpeningChapterGapCandidate,
  buildOpeningChapterGapFillInput
} = require("../src/lib/opening-chapter-generation.ts");
const { getAiRecoveryCopy } = require("../src/lib/ai-recovery-copy.ts");

const scheme = {
  id: "gap-fill-scheme",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "税务所门口，主角看到母亲记忆被贴上欠税封条。",
  premise: "底层少年必须夺回母亲的人生记录。",
  storyEngine: "每次破局都要拿自己的记忆和关系去换。",
  coreConcept: "记忆是城市唯一合法流通的硬通货。",
  powerSystem: "读取记忆残片会损耗自己的真实经历。",
  conflictType: "主角对抗垄断记忆税的旧势力。",
  emotionCurve: "压迫 -> 反击 -> 更大代价",
  similarSettingHints: []
};
const outlineNodes = createOutlineFromScheme(scheme);
const openingChapterPlan = ensureOpeningChapterPlan({
  outlineNodes,
  updatedAt: "2026-07-20T00:00:00.000Z"
});
const seedDrafts = ensureOpeningChapterDrafts({
  openingChapterPlan,
  updatedAt: "2026-07-20T00:00:00.000Z"
});
const chapterContent = "沈砚站在税务所门口。\n\n管事伸手去撕母亲的记忆封条。";
const openingChapterDrafts = {
  ...seedDrafts,
  chapters: seedDrafts.chapters.map((draft) => draft.chapterNumber === 1
    ? { ...draft, content: chapterContent, status: "draft", updatedAt: "2026-07-20T00:01:00.000Z" }
    : draft)
};
const project = {
  id: "gap-fill-project",
  title: scheme.title,
  seedText: "记忆税",
  selectedScheme: scheme,
  outlineNodes,
  openingChapterPlan,
  openingChapterDrafts,
  worldState: undefined,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:01:00.000Z"
};

const cursor = chapterContent.indexOf("管事");
const gapInput = buildOpeningChapterGapFillInput(
  project,
  1,
  { id: "pressure", label: "爽点 / 压力", message: "正文需要更明确的压迫。" },
  cursor,
  cursor
);
const inserted = applyOpeningChapterGapCandidate(chapterContent, "门内响起催缴铜钟。", cursor, cursor);
const selectedStart = chapterContent.indexOf("管事");
const selectedEnd = chapterContent.length;
const replaced = applyOpeningChapterGapCandidate(
  chapterContent,
  "管事当众宣告：今天不交税，就抹掉她最后一段记忆。",
  selectedStart,
  selectedEnd
);

const clientSource = fs.readFileSync(path.join(root, "src/lib/llm/client-provider.ts"), "utf8");
const mockSource = fs.readFileSync(path.join(root, "src/lib/llm/mock-provider.ts"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src/components/OpeningChapterDraftEditor.tsx"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "src/app/api/llm/fill-opening-chapter-gap/route.ts"), "utf8");

const checks = [
  {
    id: "gap-context-is-local-and-structured",
    passed:
      gapInput.gap.id === "pressure" &&
      gapInput.draftContext.beforeSelection.endsWith("沈砚站在税务所门口。\n\n") &&
      gapInput.draftContext.afterSelection.startsWith("管事") &&
      gapInput.requiredFacts.length > 0,
    detail: JSON.stringify(gapInput.draftContext)
  },
  {
    id: "candidate-inserts-at-cursor",
    passed:
      inserted.includes("沈砚站在税务所门口。\n\n门内响起催缴铜钟。\n\n管事") &&
      inserted !== chapterContent,
    detail: inserted
  },
  {
    id: "candidate-replaces-selection",
    passed:
      replaced.startsWith("沈砚站在税务所门口。\n\n") &&
      replaced.endsWith("抹掉她最后一段记忆。") &&
      !replaced.includes("撕母亲"),
    detail: replaced
  },
  {
    id: "real-provider-without-mock-fallback",
    passed:
      clientSource.includes('startAiRun("fillOpeningChapterGap")') &&
      clientSource.includes("/api/llm/fill-opening-chapter-gap") &&
      !clientSource.includes("mockLlmProvider.fillOpeningChapterGap") &&
      mockSource.includes("Opening chapter gap fill does not support mock fallback"),
    detail: "dedicated run and route; mock provider throws"
  },
  {
    id: "preview-before-apply-ui",
    passed:
      editorSource.includes("采纳到正文") &&
      editorSource.includes("AI 补写候选") &&
      editorSource.includes("&& !stale") &&
      workbenchSource.includes("handleApplyOpeningChapterGapFill") &&
      workbenchSource.includes("sourcePlanSignature") &&
      workbenchSource.includes('origin: "hybrid"') &&
      routeSource.includes("Invalid fillOpeningChapterGap request body."),
    detail: "candidate preview, explicit apply, hybrid provenance and route validation are wired"
  },
  {
    id: "no-fallback-recovery-copy",
    passed:
      !getAiRecoveryCopy(new Error("request timed out"), "正文缺口补写", { fallbackAvailable: false })
        .message.includes("本地兜底"),
    detail: getAiRecoveryCopy(new Error("request timed out"), "正文缺口补写", { fallbackAvailable: false }).message
  }
];

console.table(checks);
const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
