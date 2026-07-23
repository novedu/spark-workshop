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
const { createOutlineFromScheme, ensureSerialArcNodes } = require("../src/lib/outline-template.ts");
const { serialArcFieldDefinitions } = require("../src/lib/serial-arc-fields.ts");
const outlineEditorSource = fs.readFileSync(path.join(root, "src/components/OutlineEditor.tsx"), "utf8");
const creativeWorkbenchSource = fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8");
const theoryCheckerPanelSource = fs.readFileSync(path.join(root, "src/components/TheoryCheckerPanel.tsx"), "utf8");

const sampleScheme = {
  id: "v2-serial-arc",
  type: "preference",
  title: "记忆税城",
  tagline: "想救一个人，先交出一段人生。",
  storyHook: "主角发现城市每月征收记忆税。",
  premise: "底层少年用记忆残片换取力量，逐步撬开城市税务司的规则。",
  storyEngine: "每一卷解决一种记忆税规则，同时打开更高层地图。",
  coreConcept: "记忆是城市硬通货，底层人会被抽走人生证明。",
  powerSystem: "读取记忆残片会换来短暂能力，但代价是失去与亲近之人的联系。",
  conflictType: "主角要夺回母亲被清空的人生记录，城市税务司必须阻止他。",
  emotionCurve: "憋屈开局 -> 爽点循环 -> 真相压迫 -> 长线兑现",
  similarSettingHints: []
};

const outlineNodes = createOutlineFromScheme(sampleScheme);
const serialArcFieldKeys = serialArcFieldDefinitions.map((definition) => definition.key);
const actNodes = outlineNodes.filter((node) => node.kind === "act");
const arcPhaseNodes = outlineNodes.filter((node) => node.kind === "arcPhase");
const oldThreeActNodes = outlineNodes.filter((node) =>
  ["world", "protagonist", "antagonist", "golden-finger", "core-conflict", "act-1", "act-2", "act-3", "foreshadowing"].includes(node.id)
);
const migratedNodes = ensureSerialArcNodes(oldThreeActNodes);
const migratedWithAuthorFields = ensureSerialArcNodes(
  outlineNodes.map((node) =>
    node.id === "act-2"
      ? {
          ...node,
          metadata: {
            chapterRange: "31-120",
            volumeGoal: "作者手写：只验证不要覆盖"
          }
        }
      : node
  )
);

const markdown = buildProjectMarkdown({
  id: "v2-serial-arc-project",
  title: sampleScheme.title,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z"
});

const editedSerialFields = {
  volumeGoal: "作者验收：夺回母亲第一段记忆档案",
  mapLayer: "作者验收：外城区记忆税务所",
  pressureSource: "作者验收：税务所稽查队长持续追缴",
  upgradeResource: "作者验收：能抵扣记忆税的旧账本",
  miniClimax: "作者验收：公开审账反杀稽查队长",
  nextVolumeHook: "作者验收：账本指向内城空白档案库"
};
const editedPhaseFields = {
  readerQuestion: "作者验收：这一阶段主角为什么必须硬闯税务所？",
  pressureSource: "作者验收：税务所稽查制度",
  payoffBeat: "作者验收：公开夺回被抽走的记忆残片",
  chapterHook: "作者验收：税务所后面还有更高层档案库",
  stateChange: "作者验收：主角从受害者变成追税的人"
};
const editedOutlineNodes = outlineNodes.map((node) => {
  if (node.id === "act-3") {
    return {
      ...node,
      metadata: {
        ...(node.metadata ?? {}),
        ...editedSerialFields
      }
    };
  }

  if (node.id === "act-3-phase-2") {
    return {
      ...node,
      metadata: {
        ...(node.metadata ?? {}),
        ...editedPhaseFields
      }
    };
  }

  return node;
});
const editedProject = {
  id: "v2-serial-arc-edited-project",
  title: `${sampleScheme.title} 编辑验收`,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes: editedOutlineNodes,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:10:00.000Z"
};
const savedProjectClone = JSON.parse(JSON.stringify(editedProject));
const snapshotClone = JSON.parse(
  JSON.stringify({
    id: "v2-serial-arc-snapshot",
    projectId: editedProject.id,
    createdAt: "2026-07-18T00:11:00.000Z",
    reason: "manualSave",
    data: editedProject
  })
);
const editedMarkdown = buildProjectMarkdown(savedProjectClone);

const checks = [
  {
    id: "act-node-count",
    passed: actNodes.length === 7,
    detail: `actNodes=${actNodes.length}`
  },
  {
    id: "arc-phase-count",
    passed: arcPhaseNodes.length >= 19,
    detail: `arcPhaseNodes=${arcPhaseNodes.length}`
  },
  {
    id: "act-field-defaults",
    passed: actNodes.every((node) =>
      serialArcFieldKeys.every((key) => typeof node.metadata?.[key] === "string" && node.metadata[key].length > 0)
    ),
    detail: `fields=${serialArcFieldKeys.join(",")}`
  },
  {
    id: "arc-phase-defaults",
    passed:
      arcPhaseNodes.length > 0 &&
      arcPhaseNodes.every(
        (node) =>
          typeof node.parentId === "string" &&
          node.parentId.startsWith("act-") &&
          typeof node.metadata?.phaseRole === "string" &&
          typeof node.metadata?.readerQuestion === "string" &&
          typeof node.metadata?.chapterHook === "string"
      ),
    detail: arcPhaseNodes.map((node) => `${node.id}:${node.parentId}`).join(",")
  },
  {
    id: "old-three-act-migration",
    passed: ["act-4", "act-5", "act-6", "act-7"].every((id) => migratedNodes.some((node) => node.id === id)),
    detail: migratedNodes.map((node) => node.id).join(",")
  },
  {
    id: "old-phase-migration",
    passed: migratedNodes.filter((node) => node.kind === "arcPhase").length >= 19,
    detail: migratedNodes.filter((node) => node.kind === "arcPhase").map((node) => `${node.id}:${node.parentId}`).join(",")
  },
  {
    id: "author-field-preserved",
    passed:
      migratedWithAuthorFields.find((node) => node.id === "act-2")?.metadata?.volumeGoal ===
      "作者手写：只验证不要覆盖",
    detail: JSON.stringify(migratedWithAuthorFields.find((node) => node.id === "act-2")?.metadata)
  },
  {
    id: "markdown-serial-fields",
    passed:
      markdown.includes("卷纲字段：") &&
      markdown.includes("#### 阶段 1：立局钩子") &&
      markdown.includes("阶段字段：") &&
      markdown.includes("读者问题") &&
      markdown.includes("阶段钩子") &&
      markdown.includes("状态变化"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "ui-arc-phase-support",
    passed:
      outlineEditorSource.includes('kind === "arcPhase"') &&
      outlineEditorSource.includes("createArcPhaseNode") &&
      creativeWorkbenchSource.includes("child-phase"),
    detail: "OutlineEditor can create arcPhase child nodes; left nav renders phase indentation"
  },
  {
    id: "ui-act-fields-still-collapsed",
    passed:
      outlineEditorSource.includes('selectedNode.kind === "act"') &&
      outlineEditorSource.includes("node-serial-summary") &&
      outlineEditorSource.includes("aria-expanded={serialFieldsExpanded}"),
    detail: "Act serial arc fields remain collapsed with summary preview"
  },
  {
    id: "ui-theory-default-display-limited",
    passed:
      theoryCheckerPanelSource.includes("DEFAULT_VISIBLE_THEORY_LIMIT = 5") &&
      theoryCheckerPanelSource.includes("overflowSuggestions") &&
      theoryCheckerPanelSource.includes("查看其余诊断"),
    detail: "Theory panel defaults to a focused top-5 diagnosis list with overflow collapsed"
  },
  {
    id: "save-model-preserves-act-edits",
    passed: Object.entries(editedSerialFields).every(
      ([key, value]) =>
        savedProjectClone.outlineNodes.find((node) => node.id === "act-3")?.metadata?.[key] === value
    ),
    detail: JSON.stringify(savedProjectClone.outlineNodes.find((node) => node.id === "act-3")?.metadata)
  },
  {
    id: "snapshot-preserves-phase-edits",
    passed: Object.entries(editedPhaseFields).every(
      ([key, value]) =>
        snapshotClone.data.outlineNodes.find((node) => node.id === "act-3-phase-2")?.metadata?.[key] === value
    ),
    detail: JSON.stringify(snapshotClone.data.outlineNodes.find((node) => node.id === "act-3-phase-2")?.metadata)
  },
  {
    id: "markdown-edited-act-fields",
    passed: Object.entries(editedSerialFields).every(([, value]) => editedMarkdown.includes(value)),
    detail: `editedMarkdownLength=${editedMarkdown.length}`
  },
  {
    id: "markdown-edited-phase-fields",
    passed: Object.entries(editedPhaseFields).every(([, value]) => editedMarkdown.includes(value)),
    detail: JSON.stringify(savedProjectClone.outlineNodes.find((node) => node.id === "act-3-phase-2")?.metadata)
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}
