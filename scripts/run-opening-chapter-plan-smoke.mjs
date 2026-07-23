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
const { mockLlmProvider } = require("../src/lib/llm/mock-provider.ts");
const { createOpeningChapterPlan, ensureOpeningChapterPlan, getOpeningChapterPlanCounts } = require("../src/lib/opening-chapter-plan.ts");
const { createOutlineFromScheme } = require("../src/lib/outline-template.ts");
const { ensureWorldState, queryWorldState } = require("../src/lib/world-state.ts");

const storageSource = fs.readFileSync(path.join(root, "src/lib/storage.ts"), "utf8");
const exportMarkdownSource = fs.readFileSync(path.join(root, "src/lib/export-markdown.ts"), "utf8");
const typeSource = fs.readFileSync(path.join(root, "src/types/product.ts"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src/components/OpeningChapterPlanEditor.tsx"), "utf8");
const clientProviderSource = fs.readFileSync(path.join(root, "src/lib/llm/client-provider.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "src/app/api/llm/generate-opening-chapter-plan/route.ts"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

const sampleScheme = {
  id: "opening-plan-smoke",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "主角发现城市每月征收记忆税。",
  premise: "底层少年用记忆残片换取力量，逐步撬开城市税务司的规则。",
  storyEngine: "每一卷解决一种记忆税规则，同时打开更高层地图。",
  coreConcept: "记忆是城市硬通货。",
  powerSystem: "读取记忆残片会换来短暂能力，但代价是失去联系。",
  conflictType: "主角要夺回母亲被清空的人生记录。",
  emotionCurve: "憋屈开局 -> 爽点循环 -> 真相压迫",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(sampleScheme);
const plan = createOpeningChapterPlan(outlineNodes, "2026-07-20T00:00:00.000Z");
const editedPlan = {
  ...plan,
  chapters: [
    {
      ...plan.chapters[0],
      title: "第1章：作者手写开局钩子",
      readerQuestion: "作者验收：主角为什么必须缴记忆税？",
      sceneTask: "作者验收：在税务所门口让主角被公开压迫。",
      pressureOrPayoff: "作者验收：管事当众扣下母亲档案。",
      chapterHook: "作者验收：旧账本第一次发热。",
      requiredFactIds: ["protagonist-main", "pressure-opening", "golden-finger-ability-core"],
      stateChange: "作者验收：主角从逃避缴税变成主动追查旧账本。"
    },
    ...plan.chapters.slice(1, 28)
  ]
};
const migratedPlan = ensureOpeningChapterPlan({
  outlineNodes,
  openingChapterPlan: editedPlan,
  updatedAt: "2026-07-20T00:10:00.000Z"
});
const worldState = ensureWorldState({
  outlineNodes,
  openingChapterPlan: migratedPlan,
  updatedAt: "2026-07-20T00:10:00.000Z"
});
const project = {
  id: "opening-plan-smoke-project",
  title: sampleScheme.title,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes,
  openingChapterPlan: migratedPlan,
  worldState,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:10:00.000Z"
};
const markdown = buildProjectMarkdown(project);
const mockGenerated = await mockLlmProvider.generateOpeningChapterPlan({
  outlineNodes,
  openingChapterPlan: migratedPlan
});
const counts = getOpeningChapterPlanCounts(migratedPlan);
const chapterEvents = queryWorldState(worldState, {
  eventKinds: ["stateChange"],
  eventStatuses: ["planned"]
}).events.filter((event) => event.source?.nodeId?.startsWith("opening-chapter-"));

const checks = [
  {
    id: "opening-plan-shape",
    passed:
      plan.version === 1 &&
      plan.chapterRange === "1-30" &&
      plan.sourceActId === "act-1" &&
      plan.chapters.length === 30,
    detail: `chapters=${plan.chapters.length}, sourceActId=${plan.sourceActId}`
  },
  {
    id: "chapter-fields-complete",
    passed:
      plan.chapters.every((chapter) =>
        chapter.title &&
        chapter.readerQuestion &&
        chapter.sceneTask &&
        chapter.pressureOrPayoff &&
        chapter.chapterHook &&
        Array.isArray(chapter.requiredFactIds) &&
        chapter.requiredFactIds.length > 0 &&
        chapter.stateChange
      ),
    detail: JSON.stringify(plan.chapters[0])
  },
  {
    id: "author-edits-preserved-and-missing-filled",
    passed:
      migratedPlan.chapters.length === 30 &&
      migratedPlan.chapters[0].readerQuestion === "作者验收：主角为什么必须缴记忆税？" &&
      migratedPlan.chapters[0].requiredFactIds.includes("golden-finger-ability-core") &&
      migratedPlan.chapters[29].chapterNumber === 30 &&
      migratedPlan.chapters[29].chapterHook.length > 0,
    detail: JSON.stringify({
      first: migratedPlan.chapters[0],
      last: migratedPlan.chapters[29]
    })
  },
  {
    id: "opening-plan-counts",
    passed:
      counts.chapters === 30 &&
      counts.chaptersWithHooks === 30 &&
      counts.chaptersWithStateChange === 30 &&
      counts.chaptersWithRequiredFacts === 30,
    detail: JSON.stringify(counts)
  },
  {
    id: "world-state-chapter-events",
    passed:
      chapterEvents.length === 30 &&
      chapterEvents.some((event) => event.id === "opening-chapter-state-1" && event.summary.includes("主动追查旧账本")) &&
      chapterEvents.every((event) => event.relatedEntityIds?.length > 0),
    detail: `chapterEvents=${chapterEvents.length}`
  },
  {
    id: "markdown-opening-plan-export",
    passed:
      markdown.includes("## 前 30 章节奏表") &&
      markdown.includes("第 1 章：作者手写开局钩子") &&
      markdown.includes("读者问题：作者验收：主角为什么必须缴记忆税？") &&
      markdown.includes("依赖事实：protagonist-main、pressure-opening、golden-finger-ability-core") &&
      markdown.includes("## 世界状态基座"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "persistence-and-type-hooks",
    passed:
      storageSource.includes("ensureOpeningChapterPlan") &&
      exportMarkdownSource.includes("前 30 章节奏表") &&
      typeSource.includes("OpeningChapterPlanChapter") &&
      typeSource.includes("openingChapterPlan?: OpeningChapterPlan"),
    detail: "Project type, storage normalization and Markdown export all include openingChapterPlan"
  },
  {
    id: "ui-editor-hooks",
    passed:
      workbenchSource.includes("OpeningChapterPlanEditor") &&
      workbenchSource.includes("handleGenerateOpeningChapterPlan") &&
      editorSource.includes("opening-plan-panel") &&
      editorSource.includes("aria-label=\"前 30 章节奏表\"") &&
      cssSource.includes(".opening-plan-workspace"),
    detail: "Workbench renders editable opening chapter plan panel"
  },
  {
    id: "llm-provider-route-hooks",
    passed:
      clientProviderSource.includes("generateOpeningChapterPlan") &&
      clientProviderSource.includes("/api/llm/generate-opening-chapter-plan") &&
      routeSource.includes("serverLlmProvider.generateOpeningChapterPlan") &&
      mockGenerated.openingChapterPlan.chapters.length === 30 &&
      mockGenerated.suggestions.length > 0,
    detail: `mockChapters=${mockGenerated.openingChapterPlan.chapters.length}, suggestions=${mockGenerated.suggestions.length}`
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}
