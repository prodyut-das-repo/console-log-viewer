import test, { after } from "node:test";
import assert from "node:assert/strict";
import { compileModules } from "./helpers/compile-modules.mjs";

const { require, cleanup } = compileModules([
  "utils/format.ts",
  "utils/log.ts",
  "utils/json.ts",
  "utils/harValidation.ts",
  "utils/har.ts",
  ...["en", "bn", "te", "ta", "kn"].map(
    (locale) => `i18n/locales/${locale}.ts`,
  ),
]);
after(cleanup);
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

test("JSON formatting preserves exact numeric tokens and duplicate keys", () => {
  const compact =
    '{"id":9007199254740993,"large":123456789012345678901234567890,"amount":1e400,"negative":-1e400,"tiny":1e-400,"decimal":0.123456789012345678901,"zero":-0,"exponent":1E+003,"id":9007199254740995}';
  const formatted = json.formatJsonText(compact);
  assert.equal(json.formatJsonText(formatted, true), compact);
  assert.equal(json.formatJsonText(` \n ${compact} \t `, true), compact);
  for (const number of [
    "9007199254740993",
    "9007199254740995",
    "1e400",
    "-1e400",
    "1e-400",
    "0.123456789012345678901",
    "-0",
    "1E+003",
  ])
    assert.ok(formatted.includes(number), number);
  assert.ok(!formatted.includes("null"));
});

test("JSON token formatting handles nested empty containers and escaped string contents", () => {
  const value = {
    text: ' [ ] { } : , true null 1e400 " \\ \n বাংলা ಕನ್ನಡ ',
    array: [[], {}, [true, false, null]],
    object: {},
  };
  const compact = JSON.stringify(value);
  const formatted = json.formatJsonText(compact);
  assert.equal(json.formatJsonText(formatted, true), compact);
  assert.deepEqual(JSON.parse(formatted), value);
  assert.equal(json.formatJsonText("{}"), "{}");
  assert.equal(json.formatJsonText("[]"), "[]");
  for (const invalid of [
    "01",
    "NaN",
    '{"a":1,}',
    "[1,]",
    '{"text":"bad\nline"}',
  ])
    assert.throws(() => json.formatJsonText(invalid), SyntaxError);
});

test("HAR JSON body previews preserve numeric precision", () => {
  const body = '{"id":9007199254740993,"amount":1e400}';
  assert.equal(
    json.formatJsonText(har.prettifyHarBody(body, "application/json"), true),
    body,
  );
});

test("HAR validation rejects malformed nested fields instead of dropping requests", async () => {
  const mutations = [
    (item) => {
      item.request.headers = [null];
    },
    (item) => {
      item.request.headers = { length: 1 };
    },
    (item) => {
      item.request.headers = [{ name: "Accept", value: false }];
    },
    (item) => {
      item.request.queryString = "page=1";
    },
    (item) => {
      item.request.queryString = [{ name: "page", value: {} }];
    },
    (item) => {
      item.request.postData = null;
    },
    (item) => {
      item.request.postData = { text: 123 };
    },
    (item) => {
      item.request.postData = { params: [null] };
    },
    (item) => {
      item.response.headers = [{ name: 42, value: "abc" }];
    },
    (item) => {
      item.response.content = null;
    },
    (item) => {
      item.response.content.text = 123;
    },
    (item) => {
      item.response.content.mimeType = {};
    },
    (item) => {
      item.response.content.size = "12";
    },
    (item) => {
      item.response.statusText = {};
    },
    (item) => {
      item.response.httpVersion = {};
    },
    (item) => {
      item.time = "100";
    },
    (item) => {
      item.timings = null;
    },
    (item) => {
      item.timings = { wait: "100" };
    },
    (item) => {
      item.serverIPAddress = {};
    },
    (item) => {
      item.cache = [];
    },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const broken = entry("https://example.test/broken");
    mutate(broken);
    await assert.rejects(
      har.readHarCapture({
        name: "broken.har",
        text: async () =>
          JSON.stringify({
            log: { entries: [entry("https://example.test/valid"), broken] },
          }),
      }),
      /valid HAR/,
      `mutation ${index}`,
    );
  }
});

test("HAR validation accepts optional fields and unknown timing values safely", async () => {
  const item = entry("https://example.test/upload");
  item.request.headersSize = -1;
  item.request.queryString = [{ name: "page", value: "1" }];
  item.request.postData = {
    mimeType: "multipart/form-data",
    params: [{ name: "file", fileName: "sample.txt" }],
  };
  item.response.bodySize = -1;
  item.response.httpVersion = "HTTP/2";
  item.response.content.encoding = "base64";
  item.timings = { blocked: -1, dns: -1, wait: 10 };
  item.cache = {};
  const capture = await har.readHarCapture({
    name: "optional.har",
    text: async () => JSON.stringify({ log: { entries: [item] } }),
  });
  assert.deepEqual(capture.entries, [item]);
  assert.equal(
    har.compareHarCaptures(capture.entries, structuredClone(capture.entries))[0]
      .kind,
    "unchanged",
  );
});
