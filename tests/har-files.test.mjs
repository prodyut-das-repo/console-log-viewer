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
const App = require("./App.js").default;
const Sidebar = require("./components/layout/Sidebar.js").default;
const ToolHeading = require("./components/layout/ToolHeading.js").default;
const HarEmptyState = require("./features/har/HarEmptyState.js").default;
const HarWorkspace = require("./features/har/HarWorkspace.js").default;
const { useHarFiles } = require("./hooks/useHarFiles.js");
const { ClipboardProvider } = require("./providers/ClipboardProvider.js");
const { PreferencesProvider } = require("./providers/PreferencesProvider.js");
const { LanguageProvider } = require("./i18n/LanguageProvider.js");
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
const harFile = (name, url = "https://example.com/api") =>
  new File(
    [
      JSON.stringify({
        log: {
          entries: [
            {
              request: { method: "GET", url },
              response: {
                status: 200,
                content: { size: 2, text: "{}", mimeType: "application/json" },
              },
              time: 40,
            },
          ],
        },
      }),
    ],
    name,
  );

test("HAR uploads append valid captures, keep existing files on failure, and support independent removal", async (context) => {
  let state;
  let renderer;
  function Harness() {
    state = useHarFiles();
    return null;
  }
  await act(async () => {
    renderer = create(providers(h(Harness)));
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
  });
  assert.equal(state.activeFile, null);
  await act(async () => {
    assert.equal(await state.openFiles([]), false);
  });
  await act(async () => {
    assert.equal(
      await state.openFiles([
        harFile("first.har"),
        new File(["invalid JSON"], "broken.har"),
        harFile("second.har"),
      ]),
      true,
    );
  });
  assert.deepEqual(
    state.files.map((file) => file.name),
    ["first.har", "second.har"],
  );
  assert.equal(state.activeFile.name, "second.har");
  assert.match(
    renderer.root.findByProps({ role: "status" }).children.join(""),
    /valid .har capture/,
  );
  const [first, second] = state.files;
  await act(async () => {
    assert.equal(
      await state.openFiles([new File(["{}"], "not-a-capture.json")]),
      false,
    );
  });
  assert.deepEqual(state.files, [first, second]);
  assert.equal(state.activeId, second.id);
  await act(async () => {
    await state.openFiles([harFile("first.har")]);
  });
  const third = state.activeFile;
  assert.notEqual(third.id, first.id);
  await act(async () => {
    state.selectFile(second.id);
    state.removeFile(second.id);
  });
  assert.equal(state.activeId, third.id);
  await act(async () => state.removeFile(first.id));
  assert.equal(state.activeId, third.id);
  await act(async () => {
    state.removeFile(third.id);
    state.selectFile(first.id);
    state.removeFile("missing");
  });
  assert.deepEqual(state.files, []);
  assert.equal(state.activeFile, null);
  assert.equal(state.activeId, null);
});

test("HAR empty uploads, header uploads, and sidebar uploads share an independent list below logs", async (context) => {
  let renderer;
  const openedPickers = [];
  await act(async () => {
    renderer = create(providers(h(App)), {
      createNodeMock: (element) =>
        element.type === "input" && element.props.type === "file"
          ? {
              click: () =>
                openedPickers.push(element.props.accept ? "har" : "log"),
            }
          : null,
    });
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
  });
  const root = renderer.root;
  const sidebar = () => root.findByType(Sidebar);
  const heading = () => root.findByType(ToolHeading);
  const harNames = () => sidebar().props.harFiles.map((file) => file.name);
  const section = (label) => sidebar().findByProps({ "aria-label": label });
  const inputs = root.findAllByProps({ type: "file" });
  const logInput = inputs.find(
    (input) => input.props.multiple && !input.props.accept,
  );
  const harInput = inputs.find((input) => input.props.accept);
  const upload = async (input, files) => {
    await act(async () => {
      input.props.onChange({ currentTarget: { files, value: "selected" } });
      await new Promise(setImmediate);
    });
  };
  await upload(logInput, [new File(["INFO existing"], "existing.log")]);
  await act(async () => root.findByProps({ id: "tab-har" }).props.onClick());
  assert.equal(heading().findAllByType("button").length, 0);
  assert.ok(root.findByType(HarEmptyState));
  assert.equal(harInput.props.multiple, true);
  assert.deepEqual(
    sidebar()
      .findAllByProps({ className: "sidecap filecap" })
      .map((node) => node.children.join("")),
    ["LOG FILES", "HAR FILES"],
  );
  await act(async () =>
    root.findByType(HarEmptyState).findByType("button").props.onClick(),
  );
  assert.equal(openedPickers.at(-1), "har");
  await upload(harInput, [new File(["bad JSON"], "broken.har")]);
  assert.deepEqual(harNames(), []);
  assert.equal(heading().findAllByType("button").length, 0);
  assert.ok(root.findByType(HarEmptyState));
  await upload(harInput, [harFile("first.har", "https://example.com/first")]);
  assert.deepEqual(harNames(), ["first.har"]);
  assert.equal(heading().findByType("button").children.at(-1), "Open HAR file");
  await act(async () => heading().findByType("button").props.onClick());
  assert.equal(openedPickers.at(-1), "har");
  await upload(harInput, [harFile("second.har", "https://example.com/second")]);
  await act(async () =>
    section("HAR FILES").findAllByType("button").at(-1).props.onClick(),
  );
  assert.equal(openedPickers.at(-1), "har");
  await upload(harInput, [harFile("third.har", "https://example.com/third")]);
  assert.deepEqual(harNames(), ["first.har", "second.har", "third.har"]);
  assert.deepEqual(
    sidebar().props.logFiles.map((file) => file.name),
    ["existing.log"],
  );
  assert.equal(sidebar().props.activeLogId, null);
  const [first, second, third] = sidebar().props.harFiles;
  assert.equal(sidebar().props.activeHarId, third.id);
  const select = async (name) => {
    await act(async () =>
      section("HAR FILES").findByProps({ title: name }).props.onClick(),
    );
  };
  const activeSearch = () =>
    root
      .findByType(HarWorkspace)
      .children.find((child) => child.props.hidden === false)
      .findByProps({ "aria-label": "Filter HAR requests" });
  await select("first.har");
  await act(async () =>
    activeSearch().props.onChange({ currentTarget: { value: "first" } }),
  );
  await select("second.har");
  assert.equal(activeSearch().props.value, "");
  await select("first.har");
  assert.equal(activeSearch().props.value, "first");
  await act(async () =>
    section("HAR FILES")
      .findByProps({ "aria-label": "Remove third.har" })
      .props.onClick(),
  );
  assert.equal(sidebar().props.activeHarId, first.id);
  await act(async () =>
    section("HAR FILES")
      .findByProps({ "aria-label": "Remove first.har" })
      .props.onClick(),
  );
  assert.equal(sidebar().props.activeHarId, second.id);
  await act(async () =>
    section("HAR FILES")
      .findByProps({ "aria-label": "Remove second.har" })
      .props.onClick(),
  );
  assert.deepEqual(harNames(), []);
  assert.equal(heading().findAllByType("button").length, 0);
  assert.ok(root.findByType(HarEmptyState));
  await act(async () =>
    section("LOG FILES").findByProps({ title: "existing.log" }).props.onClick(),
  );
  assert.equal(heading().props.activeTool, "console");
  assert.equal(sidebar().props.activeHarId, null);
  assert.equal(sidebar().props.activeLogId, sidebar().props.logFiles[0].id);
});
