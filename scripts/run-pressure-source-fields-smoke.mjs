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
  ensurePressureSourceMetadata,
  getFilledPressureSourceFieldCount,
  getPressureSourceFieldEntries,
  getPressureSourceMetadata
} = require("../src/lib/pressure-source-fields.ts");
const { ensureWorldState, queryWorldState } = require("../src/lib/world-state.ts");
const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");

const outlineEditorSource = fs.readFileSync(path.join(root, "src/components/OutlineEditor.tsx"), "utf8");
const pressureComponentSource = fs.readFileSync(path.join(root, "src/components/PressureSourceFields.tsx"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

const sampleScheme = {
  id: "pressure-source-smoke",
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
const antagonistNode = outlineNodes.find((node) => node.kind === "antagonist");
const legacyAntagonist = {
  ...antagonistNode,
  content:
    "开局压力源：记忆税务所管事卡住母亲档案\n开局压力源出场：1-30章 / 开局卷\n阶段 boss：外城区稽查队长\n阶段 boss出场：31-120章 / 新手升级卷\n制度 / 势力压力：税务司和旧族共同维护记忆税制\n制度 / 势力压力出场：251-450章 / 势力扩张卷\n终局对手：改写记忆税源头的规则制定者\n终局对手出场：651章后逐步显形\n压力升级方式：从管事卡资源，到稽查队封身份，再到税务司修改整城规则。"
};
const migratedAntagonist = ensurePressureSourceMetadata(legacyAntagonist);
const pressureMetadata = {
  openingPressure: "记忆税务所管事卡住母亲档案",
  openingPressureStage: "1-30章 / 开局卷",
  stageBoss: "外城区稽查队长",
  stageBossStage: "31-120章 / 新手升级卷",
  systemPressure: "税务司和旧族共同维护记忆税制",
  systemPressureStage: "251-450章 / 势力扩张卷",
  finalOpponent: "改写记忆税源头的规则制定者",
  finalOpponentStage: "651章后逐步显形",
  pressureEscalation: "从管事卡资源，到稽查队封身份，再到税务司修改整城规则。"
};
const savedOutlineNodes = outlineNodes.map((node) =>
  node.id === "antagonist"
    ? {
        ...node,
        metadata: {
          ...(node.metadata ?? {}),
          ...pressureMetadata
        }
      }
    : node
);
const worldState = ensureWorldState({
  outlineNodes: savedOutlineNodes,
  worldState: undefined,
  updatedAt: "2026-07-20T00:00:00.000Z"
});
const clearedPressureState = ensureWorldState({
  outlineNodes: savedOutlineNodes.map((node) =>
    node.id === "antagonist"
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
  id: "pressure-source-smoke-project",
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
const queriedPressureEntities = queryWorldState(worldState, {
  entityIds: ["pressure-opening", "pressure-stage-boss", "pressure-system", "pressure-final-opponent", "pressure-escalation"]
});

const checks = [
  {
    id: "pressure-field-defaults-empty",
    passed:
      getFilledPressureSourceFieldCount(antagonistNode.metadata) === 0 &&
      getPressureSourceFieldEntries(antagonistNode.metadata).length === 5,
    detail: JSON.stringify(getPressureSourceMetadata(antagonistNode))
  },
  {
    id: "legacy-pressure-migration",
    passed:
      migratedAntagonist.metadata?.openingPressure === "记忆税务所管事卡住母亲档案" &&
      migratedAntagonist.metadata?.stageBoss === "外城区稽查队长" &&
      migratedAntagonist.metadata?.systemPressure === "税务司和旧族共同维护记忆税制" &&
      migratedAntagonist.metadata?.finalOpponent === "改写记忆税源头的规则制定者" &&
      migratedAntagonist.metadata?.pressureEscalation.includes("税务司修改整城规则"),
    detail: JSON.stringify(migratedAntagonist.metadata)
  },
  {
    id: "world-state-pressure-entities",
    passed:
      worldState.entities.some((entity) => entity.id === "pressure-opening" && entity.currentState === "1-30章 / 开局卷") &&
      worldState.entities.some((entity) => entity.id === "pressure-stage-boss" && entity.kind === "character") &&
      worldState.entities.some((entity) => entity.id === "pressure-system" && entity.kind === "faction") &&
      worldState.entities.some((entity) => entity.id === "pressure-escalation" && entity.kind === "rule"),
    detail: JSON.stringify(queriedPressureEntities.entities)
  },
  {
    id: "markdown-pressure-export",
    passed:
      markdown.includes("压力源链字段：") &&
      markdown.includes("开局压力源（出场：1-30章 / 开局卷）") &&
      markdown.includes("阶段 boss（出场：31-120章 / 新手升级卷）") &&
      markdown.includes("压力升级方式"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "cleared-pressure-removes-managed-entities",
    passed:
      !clearedPressureState.entities.some((entity) =>
        ["pressure-opening", "pressure-stage-boss", "pressure-system", "pressure-final-opponent", "pressure-escalation"].includes(entity.id)
      ),
    detail: JSON.stringify(clearedPressureState.entities)
  },
  {
    id: "ui-pressure-field-support",
    passed:
      outlineEditorSource.includes('selectedNode.kind === "antagonist"') &&
      outlineEditorSource.includes("PressureSourceFields") &&
      pressureComponentSource.includes("node-pressure-chain") &&
      pressureComponentSource.includes("aria-label=\"压力源链字段\"") &&
      cssSource.includes(".node-pressure-fields") &&
      cssSource.includes(".node-pressure-field-label"),
    detail: "OutlineEditor renders pressure source chain fields with compact field styles"
  },
  {
    id: "save-and-snapshot-model-preserves-pressure-fields",
    passed:
      Object.entries(pressureMetadata).every(
        ([key, value]) =>
          JSON.parse(JSON.stringify(project)).outlineNodes.find((node) => node.id === "antagonist")?.metadata?.[key] === value
      ) &&
      Object.entries(pressureMetadata).every(
        ([key, value]) =>
          JSON.parse(JSON.stringify({ data: project })).data.outlineNodes.find((node) => node.id === "antagonist")?.metadata?.[key] === value
      ),
    detail: JSON.stringify(savedOutlineNodes.find((node) => node.id === "antagonist")?.metadata)
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}
