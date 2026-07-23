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

const { formatTheoryEvidence, matchTheorySuggestions, runTheoryChecks } = require("../src/lib/theory-checker.ts");

const node = (id, kind, title, content, order, metadata = undefined, parentId = undefined) => ({
  id,
  kind,
  title,
  content,
  order,
  ...(metadata ? { metadata } : {}),
  ...(parentId ? { parentId } : {})
});

const outlineNodes = [
  node("world", "world", "世界观设定", "记忆税城有规则和资源垄断。", 0),
  node("protagonist", "protagonist", "主角", "", 1, {
    identity: "沈砚｜记忆税城底层账工",
    coreDesire: "成为能决定自己记忆归属的人",
    openingPredicament: "母亲档案被税务所扣押"
  }),
  node("antagonist", "antagonist", "反派/压力源", "", 2, {
    openingPressure: "税务所管事用欠税名义逼主角交出母亲记忆",
    stageBoss: "外城区稽查队长",
    pressureEscalation: "从扣档案升级到封锁合法身份"
  }),
  node("golden-finger", "goldenFinger", "金手指/力量体系", "", 3, {
    abilityCore: "主角能读取记忆残片并临时借用一项能力"
  }),
  node("core-conflict", "conflict", "核心冲突", "", 4),
  node("act-1", "act", "第一卷：开局篇", "", 5, {
    volumeGoal: "夺回母亲第一段记忆档案"
  }),
  node("act-1-phase-1", "arcPhase", "阶段 1：立局钩子", "主角被税务所公开压制。", 6, {
    chapterRange: "1-3",
    readerQuestion: "主角为什么必须反抗记忆税？",
    pressureSource: "税务所管事",
    chapterHook: "旧账本第一次发热"
  }, "act-1"),
  node("foreshadowing", "foreshadowing", "伏笔与回收", "", 7)
];

const openingChapterPlan = {
  version: 1,
  chapterRange: "1-30",
  sourceActId: "act-1",
  updatedAt: "2026-07-20T00:00:00.000Z",
  chapters: Array.from({ length: 30 }, (_, index) => {
    const chapterNumber = index + 1;
    return {
      chapterNumber,
      title: `第${chapterNumber}章：记忆税压迫`,
      arcPhaseId: "act-1-phase-1",
      readerQuestion: "主角能不能夺回母亲档案？",
      sceneTask: "税务所管事继续压迫主角。",
      pressureOrPayoff: chapterNumber === 2 ? "管事公开压制主角，主角只拿到半条线索。" : "",
      chapterHook: chapterNumber === 1 ? "旧账本发热，指向被隐藏的税务旧案。" : "",
      requiredFactIds: ["protagonist-main", "pressure-opening"],
      stateChange: chapterNumber === 3 ? "主角从忍耐变成主动查账。" : ""
    };
  })
};

const context = { outlineNodes, openingChapterPlan };
const checks = runTheoryChecks(context);
const matches = matchTheorySuggestions(context, "golden-finger");

const t02 = checks.find((check) => check.theoryId === "T02");
const t03 = checks.find((check) => check.theoryId === "T03");
const t07 = checks.find((check) => check.theoryId === "T07");
const t11 = checks.find((check) => check.theoryId === "T11");
const t11Match = matches.find((match) => match.theoryId === "T11");
const formattedEvidence = t11?.evidence?.[0] ? formatTheoryEvidence(t11.evidence[0]) : "";

const assertions = [
  {
    id: "protagonist-field-evidence",
    passed: Boolean(t02?.evidence?.some((item) => item.source === "field" && item.label.includes("底层欲望"))),
    detail: JSON.stringify(t02?.evidence ?? [])
  },
  {
    id: "conflict-gap-evidence",
    passed: Boolean(t03?.evidence?.some((item) => item.source === "gap")),
    detail: JSON.stringify(t03?.evidence ?? [])
  },
  {
    id: "opening-chapter-evidence",
    passed: Boolean(t07?.evidence?.some((item) => item.source === "chapter")),
    detail: JSON.stringify(t07?.evidence ?? [])
  },
  {
    id: "golden-finger-match-keeps-evidence",
    passed: Boolean(t11Match?.evidence?.some((item) => item.source === "field" || item.source === "gap")),
    detail: JSON.stringify(t11Match?.evidence ?? [])
  },
  {
    id: "llm-evidence-format",
    passed: formattedEvidence.includes("：") && formattedEvidence.length > 8,
    detail: formattedEvidence
  }
];

console.table(assertions);

const failed = assertions.filter((assertion) => !assertion.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
