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

const { buildProjectMarkdown, sanitizeMarkdownFilename } = require("../src/lib/export-markdown.ts");
const { createOutlineFromScheme, ensureSerialArcNodes } = require("../src/lib/outline-template.ts");
const { runQualityChecks } = require("../src/lib/quality-checker.ts");
const { serialArcFieldDefinitions } = require("../src/lib/serial-arc-fields.ts");
const { evaluateTheorySamples } = require("../src/lib/theory-eval-samples.ts");
const { runTheoryChecks } = require("../src/lib/theory-checker.ts");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const sampleScheme = {
  id: "acceptance-memory",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "主角在替人顶罪当天，发现每个人的记忆都被城市按月征税。",
  premise: "一个底层少年用被征走的记忆换取力量，却必须找回自己为什么要反抗。",
  storyEngine: "每一卷解决一种记忆税规则，同时暴露更高层的资源垄断者。",
  coreConcept: "记忆是城市的硬通货，越底层的人越容易被抽走人生证明。",
  powerSystem: "主角能短暂读取被征走的记忆残片，但每次使用都会失去一段与亲近之人的联系。",
  conflictType: "主角要夺回母亲被清空的人生记录，城市税务司和既得利益者必须阻止他。",
  emotionCurve: "憋屈开局 -> 小爽反击 -> 真相压迫 -> 长线兑现",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(sampleScheme);
const outlineIds = outlineNodes.map((node) => node.id);
const arcPhaseNodes = outlineNodes.filter((node) => node.kind === "arcPhase");

const oldThreeActOutline = outlineNodes.filter((node) =>
  ["world", "protagonist", "antagonist", "golden-finger", "core-conflict", "act-1", "act-2", "act-3", "foreshadowing"].includes(node.id)
);
const migratedOutline = ensureSerialArcNodes(oldThreeActOutline);
const migratedExistingOutline = ensureSerialArcNodes(
  outlineNodes.map((node) =>
    node.id === "act-1"
      ? {
          ...node,
          metadata: {
            chapterRange: "1-30",
            volumeGoal: "保留作者手写卷目标"
          }
        }
      : node
  )
);

const project = {
  id: "acceptance-project",
  title: sampleScheme.title,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes,
  theoryChecks: runTheoryChecks({ outlineNodes }),
  similarSettingHints: [],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z"
};

const markdown = buildProjectMarkdown(project);
const qualityChecks = runQualityChecks({ outlineNodes });
const theoryEvalResults = evaluateTheorySamples();
const failedTheorySamples = theoryEvalResults.filter((result) => !result.passed);
const arcNodes = outlineNodes.filter((node) => node.kind === "act");
const serialArcFieldKeys = serialArcFieldDefinitions.map((definition) => definition.key);

const checks = [
  {
    id: "outline-node-count",
    passed: outlineNodes.length === 36,
    detail: `outlineNodes=${outlineNodes.length}`
  },
  {
    id: "serial-arc-chain",
    passed: ["act-1", "act-2", "act-3", "act-4", "act-5", "act-6", "act-7"].every((id) => outlineIds.includes(id)),
    detail: outlineIds.filter((id) => id.startsWith("act-")).join(",")
  },
  {
    id: "arc-phase-chain",
    passed: arcPhaseNodes.length >= 19 && arcPhaseNodes.every((node) => typeof node.parentId === "string" && node.parentId.startsWith("act-")),
    detail: arcPhaseNodes.map((node) => `${node.id}:${node.parentId}`).join(",")
  },
  {
    id: "old-project-migration",
    passed: ["act-4", "act-5", "act-6", "act-7"].every((id) => migratedOutline.some((node) => node.id === id)),
    detail: migratedOutline.map((node) => node.id).join(",")
  },
  {
    id: "old-phase-migration",
    passed: migratedOutline.filter((node) => node.kind === "arcPhase").length >= 19,
    detail: migratedOutline.filter((node) => node.kind === "arcPhase").map((node) => `${node.id}:${node.parentId}`).join(",")
  },
  {
    id: "serial-arc-metadata-defaults",
    passed: arcNodes.every((node) => serialArcFieldKeys.every((key) => typeof node.metadata?.[key] === "string" && node.metadata[key].length > 0)),
    detail: `arcNodes=${arcNodes.length}, fields=${serialArcFieldKeys.join(",")}`
  },
  {
    id: "serial-arc-migration-preserves-author-fields",
    passed:
      migratedExistingOutline.find((node) => node.id === "act-1")?.metadata?.volumeGoal === "保留作者手写卷目标" &&
      typeof migratedExistingOutline.find((node) => node.id === "act-1")?.metadata?.mapLayer === "string",
    detail: JSON.stringify(migratedExistingOutline.find((node) => node.id === "act-1")?.metadata)
  },
  {
    id: "markdown-export-content",
    passed:
      markdown.includes("## 大纲节点") &&
      markdown.includes("章节范围：851-1000+") &&
      markdown.includes("#### 阶段 1：立局钩子") &&
      markdown.includes("阶段字段：") &&
      markdown.includes("## 网文质检清单") &&
      markdown.includes("卷纲字段：") &&
      markdown.includes("卷末钩子") &&
      markdown.includes("故事引擎"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "quality-checker-runs",
    passed: qualityChecks.length > 0,
    detail: `qualityChecks=${qualityChecks.length}`
  },
  {
    id: "theory-eval-samples",
    passed: failedTheorySamples.length === 0,
    detail: `samples=${theoryEvalResults.length}, failed=${failedTheorySamples.length}`
  },
  {
    id: "markdown-filename-sanitize",
    passed: sanitizeMarkdownFilename("记忆:税城/第一卷*草稿") === "记忆-税城-第一卷-草稿",
    detail: sanitizeMarkdownFilename("记忆:税城/第一卷*草稿")
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}

assert(checks.every((check) => check.passed), "V1 acceptance smoke should pass all checks.");
