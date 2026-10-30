import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

// Compile only pure modules into an isolated directory; no browser or test framework is required.
const compiled = mkdtempSync(join(tmpdir(), "logscope-tests-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
const modules = [
  "utils/format",
  "utils/log",
  "utils/json",
  "utils/har",
  ...["en", "bn", "te", "ta", "kn"].map((locale) => `i18n/locales/${locale}`),
];
for (const module of modules) {
  const source = readFileSync(
    new URL(`../src/${module}.ts`, import.meta.url),
    "utf8",
  );
  const output = join(compiled, `${module}.js`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
  );
}
const require = createRequire(join(compiled, "test.cjs"));
const json = require("./utils/json.js");
const log = require("./utils/log.js");
const har = require("./utils/har.js");
const entry = (url, overrides = {}) => ({
  request: { method: "GET", url, headers: [] },
  response: {
    status: 200,
    statusText: "OK",
    headers: [],
    content: { size: 12, mimeType: "application/json", text: '{"ok":true}' },
  },
  time: 100,
  ...overrides,
});

test("JSON formatting and minification preserve valid values and reject invalid JSON", () => {
  assert.equal(
    json.formatJsonText('{"ok":true,"values":[1,null]}', true),
    '{"ok":true,"values":[1,null]}',
  );
  assert.deepEqual(JSON.parse(json.formatJsonText('{"ok":true}')), {
    ok: true,
  });
  assert.equal(json.formatJsonText("false"), "false");
  assert.throws(() => json.formatJsonText("{broken"), SyntaxError);
});
test("JSON escape/unescape round trips Unicode, quotes, newlines, tabs and backslashes", () => {
  const text = 'ಕನ್ನಡ বাংলা తెలుగు தமிழ்\n"quoted"\tC:\\logs';
  assert.equal(json.unescapeJsonText(json.escapeJsonText(text)), text);
  assert.equal(json.unescapeJsonText(JSON.stringify(text)), text);
  assert.throws(() => json.unescapeJsonText("\\q"), SyntaxError);
});
test("log severity uses word boundaries and ANSI rendering escapes markup", () => {
  assert.equal(log.getSeverity("ERROR failed"), "error");
  assert.equal(log.getSeverity("warning: token expired"), "warn");
  assert.equal(log.getSeverity("informational errorless message"), "default");
  const html = log.ansiToHtml('\x1b[31m<script>alert("x")</script>\x1b[0m');
  assert.ok(html.includes("color:#e26354"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
});
test("HAR comparison pairs repeated endpoints by occurrence and detects query changes, additions and removals", () => {
  const before = [
    entry("https://example.test/api?page=1"),
    entry("https://example.test/api?page=2"),
    entry("https://example.test/removed"),
  ];
  const after = [
    entry("https://example.test/api?page=1"),
    entry("https://example.test/api?page=3"),
    entry("https://example.test/added"),
  ];
  const diffs = har.compareHarCaptures(before, after);
  assert.deepEqual(
    diffs.map((diff) => diff.kind),
    ["unchanged", "changed", "removed", "added"],
  );
  assert.equal(new Set(diffs.map((diff) => diff.id)).size, diffs.length);
  assert.equal(diffs[1].details[0].label, "Request URL");
});
test("HAR comparison ignores small timing jitter and header casing/order while detecting real changes", () => {
  const a = entry("https://example.test/api");
  a.request.headers = [
    { name: "Accept", value: "application/json" },
    { name: "X-Test", value: "1" },
  ];
  const b = structuredClone(a);
  b.time = 110;
  b.request.headers.reverse();
  b.request.headers[0].name = "x-test";
  assert.equal(har.compareHarCaptures([a], [b])[0].kind, "unchanged");
  b.time = 180;
  b.response.status = 500;
  b.response.content.text = '{"ok":false}';
  const labels = har
    .compareHarCaptures([a], [b])[0]
    .details.map((detail) => detail.label);
  assert.ok(labels.includes("Duration"));
  assert.ok(labels.includes("Status"));
  assert.ok(labels.includes("Response body"));
});
test("HAR file parsing rejects invalid captures and leaves source data intact", async () => {
  const entries = [entry("https://example.test/api")];
  const original = structuredClone(entries);
  const capture = await har.readHarCapture({
    name: "sample.har",
    text: async () => JSON.stringify({ log: { entries } }),
  });
  assert.equal(capture.name, "sample.har");
  assert.equal(capture.entries.length, 1);
  har.compareHarCaptures(entries, structuredClone(entries));
  assert.deepEqual(entries, original);
  await assert.rejects(
    har.readHarCapture({ text: async () => "not-json" }),
    /Could not read/,
  );
  await assert.rejects(
    har.readHarCapture({ text: async () => '{"log":{"entries":[]}}' }),
    /valid HAR/,
  );
});
test("all five locale files contain the same nonempty translation keys, including Kannada", () => {
  const english = require("./i18n/locales/en.js").default;
  for (const locale of ["bn", "te", "ta", "kn"]) {
    const messages = require(`./i18n/locales/${locale}.js`).default;
    assert.deepEqual(
      Object.keys(messages).sort(),
      Object.keys(english).sort(),
      locale,
    );
    assert.ok(
      Object.values(messages).every(
        (value) => typeof value === "string" && value.trim(),
      ),
      locale,
    );
  }
  assert.equal(require("./i18n/locales/kn.js").default.Language, "ಭಾಷೆ");
});
