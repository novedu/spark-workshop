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
  buildOpeningChapterDraftGenerationInput,
  buildOpeningChapterDraftContextSummary
} = require("../src/lib/opening-chapter-generation.ts");

const scheme = {
  id: "opening-draft-generation-scheme",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "主角在税务所门口被迫交出母亲最后一段记忆。",
  premise: "底层少年要夺回母亲的人生记录，却被记忆税务体系层层封锁。",
  storyEngine: "每次反击都要用自己的记忆和关系当筹码。",
  coreConcept: "记忆是这座城唯一被官方承认的货币。",
  powerSystem: "读取记忆残片换来短时能力，但会透支真实人生。",
  conflictType: "主角要对抗垄断记忆税的旧势力。",
  emotionCurve: "压迫 -> 反击 -> 新危机",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(scheme);
const openingChapterPlan = ensureOpeningChapterPlan({
  outlineNodes,
  updatedAt: "2026-07-20T00:00:00.000Z"
});
const openingChapterDrafts = ensureOpeningChapterDrafts({
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
          "沈砚站在记忆税务所门口，母亲名字被钉在欠税榜最上方。",
          "他刚把旧账本藏进袖子里，就听见管事说今天必须拿走母亲最后一段记忆。"
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

const project = {
  id: "project-opening-draft-generation",
  title: "记忆税城",
  seedText: "记忆税",
  selectedScheme: scheme,
  outlineNodes,
  openingChapterPlan,
  openingChapterDrafts,
  worldState: undefined,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z"
};

const generationInput = buildOpeningChapterDraftGenerationInput(project, 2);
const contextSummary = buildOpeningChapterDraftContextSummary(generationInput);

const clientProviderSource = fs.readFileSync(path.join(root, "src/lib/llm/client-provider.ts"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src/components/OpeningChapterDraftEditor.tsx"), "utf8");
const promptSource = fs.readFileSync(path.join(root, "src/lib/prompts/templates.ts"), "utf8");
const routeSource = fs.readFileSync(
  path.join(root, "src/app/api/llm/generate-opening-chapter-draft/route.ts"),
  "utf8"
);
const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");

const checks = [
  {
    id: "context-includes-current-chapter",
    passed:
      generationInput.chapterNumber === 2 &&
      generationInput.currentChapter.chapterNumber === 2 &&
      generationInput.requiredFacts.length > 0,
    detail: JSON.stringify({
      chapterNumber: generationInput.chapterNumber,
      factIds: generationInput.requiredFacts.map((fact) => fact.id)
    })
  },
  {
    id: "context-carries-previous-chapter-tail",
    passed:
      generationInput.previousChapter?.chapterNumber === 1 &&
      generationInput.previousChapter.endingExcerpt.includes("母亲最后一段记忆"),
    detail: JSON.stringify(generationInput.previousChapter)
  },
  {
    id: "context-summary-visible",
    passed:
      contextSummary.factIds.length > 0 &&
      contextSummary.previousChapterNumber === 1 &&
      contextSummary.fieldGroups.includes("压力源"),
    detail: JSON.stringify(contextSummary)
  },
  {
    id: "client-provider-has-no-mock-fallback",
    passed:
      clientProviderSource.includes('startAiRun("generateOpeningChapterDraft")') &&
      clientProviderSource.includes("/api/llm/generate-opening-chapter-draft") &&
      !clientProviderSource.includes("mockLlmProvider.generateOpeningChapterDraft"),
    detail: "client provider starts a dedicated run and never swaps in mock正文"
  },
  {
    id: "ui-and-route-hooks-present",
    passed:
      editorSource.includes("AI生成当前章") &&
      workbenchSource.includes("handleGenerateOpeningChapterDraft") &&
      routeSource.includes("Invalid generateOpeningChapterDraft request body.") &&
      promptSource.includes('id: "opening.generate-chapter-draft"') &&
      packageSource.includes("acceptance:opening-generation"),
    detail: "editor action, workbench handler, route and prompt template are wired"
  }
];

console.table(checks);
const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
