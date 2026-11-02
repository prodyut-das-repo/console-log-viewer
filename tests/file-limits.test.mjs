import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import React from "react";
import TestRenderer from "react-test-renderer";
import { compileModules } from "./helpers/compile-modules.mjs";

const modules = readdirSync(new URL("../src/", import.meta.url), {
  recursive: true,
}).filter((file) => /\.(tsx?|css)$/.test(file));
const { require, cleanup } = compileModules(modules);
const { useLogFiles } = require("./hooks/useLogFiles.js");
const { useHarFiles } = require("./hooks/useHarFiles.js");
const { readHarCapture } = require("./utils/har.js");
const {
  MAX_FILE_SIZE_BYTES,
  FILE_SIZE_LIMIT_ERROR,
} = require("./utils/fileLimits.js");
const HarInspector = require("./features/har/HarInspector.js").default;
const { LanguageProvider } = require("./i18n/LanguageProvider.js");
const { PreferencesProvider } = require("./providers/PreferencesProvider.js");
const { ClipboardProvider } = require("./providers/ClipboardProvider.js");
const { act, create } = TestRenderer;
const h = React.createElement;
const originalDocument = globalThis.document;
const originalWindow = globalThis.window;
before(() => {
  globalThis.document = { documentElement: { lang: "en" } };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
});
after(() => {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  cleanup();
});
const providers = (child) =>
  h(
    LanguageProvider,
    null,
    h(PreferencesProvider, null, h(ClipboardProvider, null, child)),
  );

// Mock only the reported size so boundary tests do not allocate large files.
const withSize = (file, size) => {
  Object.defineProperty(file, "size", { value: size });
  return file;
};
const harFile = (name) =>
  new File(
    [
      JSON.stringify({
        log: {
          entries: [
            {
              request: { method: "GET", url: "https://example.com/api" },
              response: { status: 200, content: { text: "{}" } },
            },
          ],
        },
      }),
    ],
    name,
  );
function preventReads(context, file) {
  const text = context.mock.method(file, "text", () => {
    assert.fail("Oversized file contents must not be read");
  });
  const slice = context.mock.method(file, "slice", () => {
    assert.fail("Oversized files must not be sampled");
  });
  return () => {
    assert.equal(text.mock.callCount(), 0);
    assert.equal(slice.mock.callCount(), 0);
  };
}
async function mountHook(context, hook) {
  let state;
  let renderer;
  function Harness() {
    state = hook();
    return null;
  }
  await act(async () => {
    renderer = create(providers(h(Harness)));
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
  });
  return {
    get state() {
      return state;
    },
    renderer,
  };
}

test("log uploads accept up to 12 MB, skip oversized files before reading, and preserve rejected replacement targets", async (context) => {
  const app = await mountHook(context, useLogFiles);
  const oversized = withSize(
    new File(["ERROR too large"], "large.log"),
    MAX_FILE_SIZE_BYTES + 1,
  );
  const verifyUnread = preventReads(context, oversized);
  await act(async () => {
    assert.equal(await app.state.openFiles([oversized]), false);
  });
  assert.equal(app.state.activeFile, null);
  const below = withSize(
    new File(["INFO below"], "below.log"),
    MAX_FILE_SIZE_BYTES - 1,
  );
  const atLimit = withSize(
    new File(["ERROR at limit"], "limit.log"),
    MAX_FILE_SIZE_BYTES,
  );
  await act(async () => {
    assert.equal(await app.state.openFiles([below, oversized, atLimit]), true);
  });
  assert.deepEqual(
    app.state.files.map((file) => file.name),
    ["below.log", "limit.log"],
  );
  assert.equal(app.state.activeFile.name, "limit.log");
  assert.equal(
    app.renderer.root.findByProps({ role: "status" }).children.join(""),
    FILE_SIZE_LIMIT_ERROR,
  );
  await act(async () =>
    app.state.updateFile(app.state.activeId, {
      filter: "error",
      query: "limit",
    }),
  );
  const original = app.state.activeFile;
  await act(async () => app.state.replaceFile(original.id, oversized));
  assert.equal(app.state.activeFile, original);
  assert.equal(app.state.files.length, 2);
  await act(async () => app.state.replaceFile(original.id, below));
  assert.equal(app.state.activeFile.id, original.id);
  assert.equal(app.state.activeFile.name, "below.log");
  verifyUnread();
});

test("HAR imports enforce the same boundary before parsing and retain valid files in mixed batches", async (context) => {
  const app = await mountHook(context, useHarFiles);
  const oversized = withSize(harFile("large.har"), MAX_FILE_SIZE_BYTES + 1);
  const verifyUnread = preventReads(context, oversized);
  await assert.rejects(readHarCapture(oversized), {
    message: FILE_SIZE_LIMIT_ERROR,
  });
  const below = withSize(harFile("below.har"), MAX_FILE_SIZE_BYTES - 1);
  const atLimit = withSize(harFile("limit.har"), MAX_FILE_SIZE_BYTES);
  await act(async () => {
    assert.equal(await app.state.openFiles([below, oversized, atLimit]), true);
  });
  assert.deepEqual(
    app.state.files.map((file) => file.name),
    ["below.har", "limit.har"],
  );
  const original = app.state.activeFile;
  await act(async () => {
    assert.equal(await app.state.openFiles([oversized]), false);
  });
  assert.equal(app.state.activeFile, original);
  assert.equal(app.state.files.length, 2);
  assert.equal(
    app.renderer.root.findByProps({ role: "status" }).children.join(""),
    FILE_SIZE_LIMIT_ERROR,
  );
  verifyUnread();
});

test("an oversized HAR comparison shows the size error and preserves the previous comparison", async (context) => {
  const baseline = await readHarCapture(harFile("baseline.har"));
  let renderer;
  await act(async () => {
    renderer = create(
      providers(h(HarInspector, { capture: baseline, onOpen() {} })),
    );
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
  });
  const upload = async (file) => {
    await act(async () => {
      renderer.root.findByProps({ type: "file" }).props.onChange({
        currentTarget: { files: [file], value: "selected" },
      });
      await new Promise(setImmediate);
    });
  };
  await upload(withSize(harFile("comparison.har"), MAX_FILE_SIZE_BYTES));
  const captureNames = () =>
    renderer.root
      .findByProps({ className: "har-diff-captures" })
      .findAllByType("span")
      .map((span) => span.children.join(""));
  assert.deepEqual(captureNames(), ["baseline.har", "comparison.har"]);
  const oversized = withSize(harFile("large.har"), MAX_FILE_SIZE_BYTES + 1);
  const verifyUnread = preventReads(context, oversized);
  await upload(oversized);
  assert.deepEqual(captureNames(), ["baseline.har", "comparison.har"]);
  assert.equal(
    renderer.root.findByProps({ role: "status" }).children.join(""),
    FILE_SIZE_LIMIT_ERROR,
  );
  verifyUnread();
});
