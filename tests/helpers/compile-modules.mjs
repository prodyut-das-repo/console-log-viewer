import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

export function compileModules(modules) {
  const directory = mkdtempSync(join(tmpdir(), "logscope-tests-"));
  symlinkSync(
    fileURLToPath(new URL("../../node_modules", import.meta.url)),
    join(directory, "node_modules"),
    "dir",
  );
  for (const module of modules) {
    const source = readFileSync(
      new URL(`../../src/${module}`, import.meta.url),
      "utf8",
    );
    const output = join(directory, module.replace(/\.tsx?$/, ".js"));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(
      output,
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
    );
  }
  return {
    require: createRequire(join(directory, "test.cjs")),
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}
