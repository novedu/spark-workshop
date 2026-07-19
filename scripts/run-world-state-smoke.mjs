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
  createEmptyWorldState,
  createWorldStateFromProject,
  ensureWorldState,
  getWorldStateCounts,
  queryWorldState
} = require("../src/lib/world-state.ts");
const { buildProjectMarkdown } = require("../src/lib/export-markdown.ts");

const sampleScheme = {
  id: "world-state-smoke",
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
const project = {
  id: "world-state-smoke-project",
  title: sampleScheme.title,
  seedText: "记忆",
  selectedScheme: sampleScheme,
  outlineNodes,
  theoryChecks: [],
  similarSettingHints: [],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z"
};

const initialState = createWorldStateFromProject(project, "2026-07-18T00:00:00.000Z");
const confirmedSourceNodeId = "act-1-phase-1";
const confirmedEvent = initialState.events.find((event) => event.source?.nodeId === confirmedSourceNodeId);
const stateWithAuthorData = {
  ...initialState,
  entities: [
    {
      id: "entity-protagonist",
      kind: "character",
      name: "沈砚",
      summary: "被城市抽走母亲记忆的底层少年。",
      currentState: "正在追查记忆税务司。",
      status: "active",
      source: { nodeId: "protagonist", label: "主角" },
      updatedAt: "2026-07-18T00:01:00.000Z"
    }
  ],
  relations: [
    {
      id: "relation-protagonist-tax-office",
      fromEntityId: "entity-protagonist",
      toEntityId: "entity-tax-office",
      relationType: "enemy",
      status: "active",
      summary: "主角与记忆税务司处于追查与封锁关系。",
      source: { nodeId: "core-conflict", label: "核心冲突" },
      updatedAt: "2026-07-18T00:01:00.000Z"
    }
  ],
  foreshadowings: [
    {
      id: "foreshadowing-memory-ledger",
      title: "旧账本",
      summary: "一本可以抵扣记忆税的旧账本。",
      status: "open",
      triggerCondition: "主角进入内城档案库。",
      plannedPayoff: "揭开母亲记忆被清空的真正经手人。",
      relatedEntityIds: ["entity-protagonist"],
      source: { nodeId: "act-3-phase-2", label: "首个地图卷 / 阶段 2" },
      updatedAt: "2026-07-18T00:01:00.000Z"
    }
  ],
  events: confirmedEvent
    ? initialState.events.map((event) =>
        event.id === confirmedEvent.id
          ? {
              ...event,
              status: "confirmed",
              summary: "主角已从被动承受变成主动破局。",
              relatedEntityIds: ["entity-protagonist"]
            }
          : event
      )
    : initialState.events
};

const updatedOutlineNodes = outlineNodes.map((node) =>
  node.id === "act-1-phase-1"
    ? {
        ...node,
        metadata: {
          ...(node.metadata ?? {}),
          stateChange: "作者更新：主角主动撬开第一条记忆税规则。"
        }
      }
    : node
);

const migratedOldProject = ensureWorldState({
  outlineNodes,
  updatedAt: project.updatedAt
});
const savedState = ensureWorldState({
  outlineNodes: updatedOutlineNodes,
  worldState: stateWithAuthorData,
  updatedAt: "2026-07-18T00:02:00.000Z"
});
const queriedState = queryWorldState(savedState, {
  entityIds: ["entity-protagonist"],
  foreshadowingStatus: "open",
  eventStatuses: ["planned", "confirmed"]
});
const markdown = buildProjectMarkdown({
  ...project,
  worldState: savedState
});
const emptyState = createEmptyWorldState("2026-07-18T00:00:00.000Z");
const counts = getWorldStateCounts(savedState);
const confirmedAfterMigration = savedState.events.find((event) => event.id === confirmedEvent?.id);
const plannedAfterMigration = savedState.events.find((event) => event.source?.nodeId === "act-1-phase-1" && event.status === "planned");

const checks = [
  {
    id: "empty-model-shape",
    passed:
      emptyState.version === 1 &&
      emptyState.entities.length === 0 &&
      emptyState.relations.length === 0 &&
      emptyState.foreshadowings.length === 0 &&
      emptyState.events.length === 0,
    detail: "version=1 with four empty state collections"
  },
  {
    id: "phase-state-events-migrated",
    passed: migratedOldProject.events.length >= 19 && migratedOldProject.currentArcPhaseId === "act-1-phase-1",
    detail: `events=${migratedOldProject.events.length}, currentArcPhaseId=${migratedOldProject.currentArcPhaseId}`
  },
  {
    id: "author-state-preserved",
    passed:
      savedState.entities.some((entity) => entity.id === "entity-protagonist") &&
      savedState.relations.some((relation) => relation.id === "relation-protagonist-tax-office") &&
      savedState.foreshadowings.some((item) => item.status === "open"),
    detail: JSON.stringify(counts)
  },
  {
    id: "confirmed-event-not-overwritten",
    passed:
      confirmedAfterMigration?.status === "confirmed" &&
      confirmedAfterMigration.summary === "主角已从被动承受变成主动破局。" &&
      !plannedAfterMigration,
    detail: JSON.stringify(confirmedAfterMigration)
  },
  {
    id: "planned-event-syncs-outline",
    passed:
      savedState.events.some(
        (event) =>
          event.source?.nodeId === "act-1-phase-2" &&
          event.summary.length > 0
      ),
    detail: "planned state events remain linked to arc phase sources"
  },
  {
    id: "query-by-entity-and-status",
    passed:
      queriedState.entities.length === 1 &&
      queriedState.relations.length === 1 &&
      queriedState.foreshadowings.length === 1 &&
      queriedState.events.length >= 1,
    detail: `entities=${queriedState.entities.length}, relations=${queriedState.relations.length}, foreshadowings=${queriedState.foreshadowings.length}, events=${queriedState.events.length}`
  },
  {
    id: "markdown-world-state-export",
    passed:
      markdown.includes("## 世界状态基座") &&
      markdown.includes("### 基础事实") &&
      markdown.includes("### 关系与势力") &&
      markdown.includes("### 伏笔与后果") &&
      markdown.includes("### 状态变化记录") &&
      markdown.includes("主角已从被动承受变成主动破局。"),
    detail: `markdownLength=${markdown.length}`
  },
  {
    id: "persistence-boundary-hooks",
    passed:
      fs.readFileSync(path.join(root, "src/lib/storage.ts"), "utf8").includes("ensureWorldState") &&
      fs.readFileSync(path.join(root, "src/components/CreativeWorkbench.tsx"), "utf8").includes("worldState"),
    detail: "storage and workbench normalize worldState before save"
  }
];

console.table(checks);

const failedChecks = checks.filter((check) => !check.passed);
if (failedChecks.length > 0) {
  console.error(JSON.stringify(failedChecks, null, 2));
  process.exit(1);
}
