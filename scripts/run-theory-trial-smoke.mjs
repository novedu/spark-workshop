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

const { matchTheorySuggestions } = require("../src/lib/theory-checker.ts");
const { theoryEvalSamples } = require("../src/lib/theory-eval-samples.ts");

const expectedPrimaryTheoryBySample = {
  "missing-core-skeleton": "T03",
  "complete-commercial-opening": "T02",
  "repeated-power-fantasy": "T12",
  "tool-antagonist": "T13",
  "weak-protagonist-empathy": "T02",
  "conflict-no-stakes": "T03",
  "foreshadowing-no-payoff": "T04",
  "power-without-boundary": "T11",
  "thin-serial-rhythm": "T07",
  "thin-world-ecology": "T13"
};

const DEFAULT_VISIBLE_THEORY_LIMIT = 5;

const getDefaultVisibleTheoryIds = (sample) => {
  const matches = matchTheorySuggestions(
    { outlineNodes: sample.outlineNodes },
    sample.selectedNodeId
  );
  const needsFix = matches.filter((match) => match.level === "needs_fix");
  const suggestCheck = matches.filter((match) => match.level === "suggest_check");
  const visibleNeedsFix = needsFix.slice(0, DEFAULT_VISIBLE_THEORY_LIMIT);
  const remainingSlots = Math.max(0, DEFAULT_VISIBLE_THEORY_LIMIT - visibleNeedsFix.length);
  const visibleSuggestCheck = suggestCheck.slice(0, remainingSlots);
  return [...visibleNeedsFix, ...visibleSuggestCheck].map((match) => match.theoryId);
};

const checks = theoryEvalSamples.map((sample) => {
  const visibleTheoryIds = getDefaultVisibleTheoryIds(sample);
  const expectedPrimaryTheory = expectedPrimaryTheoryBySample[sample.id];
  const passed = expectedPrimaryTheory === null
    ? visibleTheoryIds.length === 0
    : visibleTheoryIds[0] === expectedPrimaryTheory && visibleTheoryIds.length <= DEFAULT_VISIBLE_THEORY_LIMIT;

  return {
    sample: sample.id,
    passed,
    expectedPrimaryTheory: expectedPrimaryTheory ?? "-",
    visible: visibleTheoryIds.join(",") || "-"
  };
});

console.table(checks);

const failed = checks.filter((check) => !check.passed);
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
