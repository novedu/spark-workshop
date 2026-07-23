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

const { evaluateTheorySamples } = require("../src/lib/theory-eval-samples.ts");
const results = evaluateTheorySamples();
const failed = results.filter((result) => !result.passed);
const minSampleCount = 10;

console.table(
  results.map((result) => ({
    sample: result.sampleId,
    passed: result.passed,
    checks: result.checkIds.join(",") || "-",
    needsFix: result.needsFixIds.join(",") || "-"
  }))
);

if (results.length < minSampleCount) {
  console.error(`Expected at least ${minSampleCount} theory eval samples, got ${results.length}.`);
  process.exit(1);
}

if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}
