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
const { ensureProtagonistMetadata, getProtagonistMetadata } = require("../src/lib/protagonist-fields.ts");
const { ensureWorldState } = require("../src/lib/world-state.ts");
const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");

const sampleScheme = {
  id: "protagonist-smoke",
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
const protagonistNode = outlineNodes.find((node) => node.kind === "protagonist");
const legacyProtagonist = {
  ...protagonistNode,
  content:
    "姓名：沈砚\n底层欲望：证明自己不是可以被随手牺牲的人\n开场困境：被家族安排替嫡系顶罪\n成长弧线：从只想活下去，到学会利用规则并主动承担代价\n关键关系：母亲（失踪）；旧友（唯一知情者）"
};
const migratedProtagonist = ensureProtagonistMetadata(legacyProtagonist);
const savedOutlineNodes = outlineNodes.map((node) =>
  node.id === "protagonist"
    ? {
        ...node,
        metadata: {
          ...(node.metadata ?? {}),
          identity: "沈砚",
          coreDesire: "证明自己不是可以被随手牺牲的人",
          openingPredicament: "被家族安排替嫡系顶罪",
          growthArc: "从只想活下去，到学会利用规则并主动承担代价",
          keyRelationships: "母亲（失踪）；旧友（唯一知情者）"
        }
      }
    : node
);
const project = {
  id: "protagonist-smoke-project",
  title: sampleScheme.title,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes: savedOutlineNodes,
  worldState: ensureWorldState({
    outlineNodes: savedOutlineNodes,
    worldState: undefined,
    updatedAt: "2026-07-18T00:00:00.000Z"
  }),
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z"
};

const markdown = buildProjectMarkdown(project);

const checks = [
  {
    id: "protagonist-field-count",
    passed:
      Object.values(getProtagonistMetadata(protagonistNode)).every((value) => value === "") &&
      typeof protagonistNode?.content === "string",
    detail: JSON.stringify(getProtagonistMetadata(protagonistNode))
  },
  {
    id: "legacy-protagonist-migration",
    passed:
      migratedProtagonist.metadata?.identity === "沈砚" &&
      migratedProtagonist.metadata?.coreDesire === "证明自己不是可以被随手牺牲的人" &&
      migratedProtagonist.metadata?.openingPredicament === "被家族安排替嫡系顶罪" &&
      migratedProtagonist.metadata?.growthArc === "从只想活下去，到学会利用规则并主动承担代价" &&
      migratedProtagonist.metadata?.keyRelationships === "母亲（失踪）；旧友（唯一知情者）",
    detail: JSON.stringify(migratedProtagonist.metadata)
  },
  {
    id: "world-state-entity-sync",
    passed:
      project.worldState?.entities.some((entity) => entity.id === "protagonist-main" && entity.name === "沈砚") &&
      project.worldState?.entities.some((entity) => entity.id === "protagonist-main" && entity.currentState.includes("替嫡系顶罪")),
    detail: JSON.stringify(project.worldState?.entities.find((entity) => entity.id === "protagonist-main"))
  },
  {
    id: "markdown-protagonist-export",
    passed:
      markdown.includes("## 世界状态基座") &&
      markdown.includes("主角字段：") &&
      markdown.includes("沈砚") &&
      markdown.includes("证明自己不是可以被随手牺牲的人"),
    detail: `markdownLength=${markdown.length}`
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}
