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
const {
  ensureGoldenFingerMetadata,
  getFilledGoldenFingerFieldCount,
  getGoldenFingerFieldEntries,
  getGoldenFingerMetadata
} = require("../src/lib/golden-finger-fields.ts");
const { ensureWorldState, queryWorldState } = require("../src/lib/world-state.ts");
const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");

const outlineEditorSource = fs.readFileSync(path.join(root, "src/components/OutlineEditor.tsx"), "utf8");
const goldenComponentSource = fs.readFileSync(path.join(root, "src/components/GoldenFingerFields.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

const sampleScheme = {
  id: "golden-finger-smoke",
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
const goldenFingerNode = outlineNodes.find((node) => node.kind === "goldenFinger");
const legacyGoldenFinger = {
  ...goldenFingerNode,
  content:
    "能力核心：主角能读取记忆残片，并临时借用其中一项能力\n限制条件：必须接触承载记忆的物品，同一段记忆只能读取一次\n使用代价：每次使用会忘掉一段与亲近之人相关的真实经历\n升级方式：夺回更高阶的记忆档案，能读取的能力层级越高\n失控风险：读取过量会混淆自我记忆"
};
const migratedGoldenFinger = ensureGoldenFingerMetadata(legacyGoldenFinger);
const goldenFingerMetadata = {
  abilityCore: "主角能读取记忆残片，并临时借用其中一项能力",
  limitation: "必须接触承载记忆的物品，同一段记忆只能读取一次",
  cost: "每次使用会忘掉一段与亲近之人相关的真实经历",
  upgradePath: "夺回更高阶的记忆档案，能读取的能力层级越高",
  backlashRisk: "读取过量会混淆自我记忆，甚至把敌人的欲望当成自己的"
};
const savedOutlineNodes = outlineNodes.map((node) =>
  node.id === "golden-finger"
    ? {
        ...node,
        metadata: {
          ...(node.metadata ?? {}),
          ...goldenFingerMetadata
        }
      }
    : node
);
const worldState = ensureWorldState({
  outlineNodes: savedOutlineNodes,
  worldState: undefined,
  updatedAt: "2026-07-20T00:00:00.000Z"
});
const clearedGoldenFingerState = ensureWorldState({
  outlineNodes: savedOutlineNodes.map((node) =>
    node.id === "golden-finger"
      ? {
          ...node,
          metadata: {}
        }
      : node
  ),
  worldState,
  updatedAt: "2026-07-20T00:05:00.000Z"
});
const project = {
  id: "golden-finger-smoke-project",
  title: sampleScheme.title,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes: savedOutlineNodes,
  worldState,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z"
};
const markdown = buildProjectMarkdown(project);
const queriedGoldenFingerEntities = queryWorldState(worldState, {
  entityIds: [
    "golden-finger-ability-core",
    "golden-finger-limitation",
    "golden-finger-cost",
    "golden-finger-upgrade-path",
    "golden-finger-backlash-risk"
  ]
});
const managedGoldenFingerIds = [
  "golden-finger-ability-core",
  "golden-finger-limitation",
  "golden-finger-cost",
  "golden-finger-upgrade-path",
  "golden-finger-backlash-risk"
];

const checks = [
  {
    id: "golden-finger-field-defaults-empty",
    passed:
      getFilledGoldenFingerFieldCount(goldenFingerNode.metadata) === 0 &&
      getGoldenFingerFieldEntries(goldenFingerNode.metadata).length === 5,
    detail: JSON.stringify(getGoldenFingerMetadata(goldenFingerNode))
  },
  {
    id: "legacy-golden-finger-migration",
    passed:
      migratedGoldenFinger.metadata?.abilityCore === "主角能读取记忆残片，并临时借用其中一项能力" &&
      migratedGoldenFinger.metadata?.limitation === "必须接触承载记忆的物品，同一段记忆只能读取一次" &&
      migratedGoldenFinger.metadata?.cost === "每次使用会忘掉一段与亲近之人相关的真实经历" &&
      migratedGoldenFinger.metadata?.upgradePath === "夺回更高阶的记忆档案，能读取的能力层级越高" &&
      migratedGoldenFinger.metadata?.backlashRisk === "读取过量会混淆自我记忆",
    detail: JSON.stringify(migratedGoldenFinger.metadata)
  },
  {
    id: "world-state-golden-finger-entities",
    passed:
      worldState.entities.some((entity) => entity.id === "golden-finger-ability-core" && entity.kind === "ability") &&
      worldState.entities.some((entity) => entity.id === "golden-finger-limitation" && entity.kind === "rule") &&
      worldState.entities.some((entity) => entity.id === "golden-finger-cost" && entity.kind === "rule") &&
      worldState.entities.some((entity) => entity.id === "golden-finger-upgrade-path" && entity.kind === "ability") &&
      worldState.entities.some((entity) => entity.id === "golden-finger-backlash-risk" && entity.kind === "rule"),
    detail: JSON.stringify(queriedGoldenFingerEntities.entities)
  },
  {
    id: "markdown-golden-finger-export",
    passed:
      markdown.includes("金手指字段：") &&
      markdown.includes("能力核心：主角能读取记忆残片") &&
      markdown.includes("限制条件：必须接触承载记忆的物品") &&
      markdown.includes("失控风险：读取过量会混淆自我记忆"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "cleared-golden-finger-removes-managed-entities",
    passed: !clearedGoldenFingerState.entities.some((entity) => managedGoldenFingerIds.includes(entity.id)),
    detail: JSON.stringify(clearedGoldenFingerState.entities)
  },
  {
    id: "ui-golden-finger-field-support",
    passed:
      outlineEditorSource.includes('selectedNode.kind === "goldenFinger"') &&
      outlineEditorSource.includes("GoldenFingerFields") &&
      goldenComponentSource.includes("node-golden-system") &&
      goldenComponentSource.includes("aria-label=\"金手指字段\"") &&
      cssSource.includes(".node-golden-fields") &&
      cssSource.includes(".node-golden-field"),
    detail: "OutlineEditor renders golden finger fields with compact field styles"
  },
  {
    id: "save-and-snapshot-model-preserves-golden-finger-fields",
    passed:
      Object.entries(goldenFingerMetadata).every(
        ([key, value]) =>
          JSON.parse(JSON.stringify(project)).outlineNodes.find((node) => node.id === "golden-finger")?.metadata?.[key] === value
      ) &&
      Object.entries(goldenFingerMetadata).every(
        ([key, value]) =>
          JSON.parse(JSON.stringify({ data: project })).data.outlineNodes.find((node) => node.id === "golden-finger")?.metadata?.[key] === value
      ),
    detail: JSON.stringify(savedOutlineNodes.find((node) => node.id === "golden-finger")?.metadata)
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}
