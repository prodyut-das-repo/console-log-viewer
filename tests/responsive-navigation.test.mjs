import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer from "react-test-renderer";
import { compileModules } from "./helpers/compile-modules.mjs";

const { require, cleanup } = compileModules([
  "hooks/useMediaQuery.ts",
  "hooks/useStoredState.ts",
  "i18n/LanguageProvider.tsx",
  "providers/PreferencesProvider.tsx",
  "components/common/Icon.tsx",
  "components/layout/FileNavigation.tsx",
  "components/layout/Sidebar.tsx",
  "components/layout/SidebarFileList.tsx",
  "components/layout/AppHeader.tsx",
]);
const FileNavigation = require("./components/layout/FileNavigation.js").default;
const Sidebar = require("./components/layout/Sidebar.js").default;
const AppHeader = require("./components/layout/AppHeader.js").default;
const { LanguageProvider } = require("./i18n/LanguageProvider.js");
const {
  PreferencesProvider,
  usePreferences,
} = require("./providers/PreferencesProvider.js");
const { act, create } = TestRenderer;
const h = React.createElement;
after(cleanup);

function environment(initialWidth) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let width = initialWidth;
  const queries = new Set();
  globalThis.document = {
    documentElement: { lang: "en" },
    body: { style: { overflow: "auto" } },
  };
  globalThis.window = {
    matchMedia: (query) => {
      const limit = Number(query.match(/max-width:\s*(\d+)/)[1]);
      const listeners = new Set();
      const media = {
        matches: width <= limit,
        limit,
        listeners,
        addEventListener: (_, listener) => listeners.add(listener),
        removeEventListener: (_, listener) => listeners.delete(listener),
      };
      queries.add(media);
      return media;
    },
  };
  return {
    restore() {
      if (originalWindow === undefined) delete globalThis.window;
      else globalThis.window = originalWindow;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    },
    resize(nextWidth) {
      width = nextWidth;
      for (const media of queries) {
        media.matches = width <= media.limit;
        for (const listener of media.listeners) listener();
      }
    },
    listenerCount: () =>
      [...queries].reduce((count, media) => count + media.listeners.size, 0),
  };
}

test("mobile file navigation closes on selection, upload, Escape and backdrop, while removal stays open", async (context) => {
  const viewport = environment(390);
  const actions = [];
  const modal = {
    open: false,
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
  };
  const props = {
    logFiles: [{ id: "log", name: "first.log" }],
    activeLogId: "log",
    harFiles: [{ id: "har", name: "capture.har", entries: [] }],
    activeHarId: null,
    onSelect: (id) => actions.push(["log", id]),
    onSelectHar: (id) => actions.push(["har", id]),
    onRemove: (id) => actions.push(["remove", id]),
    onRemoveHar: () => {},
    onOpen: () => actions.push(["upload", modal.open]),
    onOpenHar: () => actions.push(["uploadHar", modal.open]),
  };
  function Harness() {
    const [open, setOpen] = React.useState(false);
    const close = React.useCallback(() => setOpen(false), []);
    return h(
      React.Fragment,
      null,
      h(AppHeader, {
        title: "first.log",
        filesOpen: open,
        onOpenFiles: () => setOpen(true),
      }),
      h(FileNavigation, { ...props, open, onClose: close }),
    );
  }
  let renderer;
  await act(async () => {
    renderer = create(
      h(LanguageProvider, null, h(PreferencesProvider, null, h(Harness))),
      {
        createNodeMock: (element) => (element.type === "dialog" ? modal : null),
      },
    );
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
    viewport.restore();
  });
  const root = renderer.root;
  const trigger = () => root.findByProps({ "aria-label": "Open file list" });
  const open = async () => {
    await act(async () => trigger().props.onClick());
  };
  assert.equal(modal.open, false);
  await open();
  assert.equal(modal.open, true);
  assert.equal(trigger().props["aria-expanded"], true);
  assert.equal(document.body.style.overflow, "hidden");
  await act(async () =>
    root.findByProps({ "aria-label": "Remove first.log" }).props.onClick(),
  );
  assert.equal(modal.open, true);
  await act(async () =>
    root
      .findByType(Sidebar)
      .findByProps({ title: "first.log" })
      .props.onClick(),
  );
  assert.equal(modal.open, false);
  assert.equal(document.body.style.overflow, "auto");
  assert.deepEqual(actions.at(-1), ["log", "log"]);
  await open();
  await act(async () => root.findByType(Sidebar).props.onOpen());
  assert.deepEqual(actions.at(-1), ["upload", false]);
  await open();
  await act(async () =>
    root.findByProps({ title: "capture.har" }).props.onClick(),
  );
  assert.deepEqual(actions.at(-1), ["har", "har"]);
  assert.equal(modal.open, false);
  await open();
  await act(async () =>
    root.findByType("dialog").props.onCancel({ preventDefault() {} }),
  );
  assert.equal(modal.open, false);
  await open();
  const backdrop = {};
  await act(async () =>
    root
      .findByType("dialog")
      .props.onClick({ target: {}, currentTarget: backdrop }),
  );
  assert.equal(modal.open, true);
  await act(async () =>
    root
      .findByType("dialog")
      .props.onClick({ target: backdrop, currentTarget: backdrop }),
  );
  assert.equal(modal.open, false);
  await open();
  await act(async () => viewport.resize(1280));
  assert.equal(root.findAllByType("dialog").length, 0);
  assert.equal(trigger().props["aria-expanded"], false);
  assert.equal(document.body.style.overflow, "auto");
  await act(async () => viewport.resize(390));
  assert.equal(modal.open, false);
  await act(async () => renderer.unmount());
  assert.equal(viewport.listenerCount(), 0);
});

test("new phone sessions use readable text sizes and reset to the current viewport default", async (context) => {
  const viewport = environment(390);
  let preferences;
  let renderer;
  function Harness() {
    preferences = usePreferences();
    return null;
  }
  await act(async () => {
    renderer = create(h(PreferencesProvider, null, h(Harness)));
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
    viewport.restore();
  });
  assert.equal(preferences.fontSize, 16);
  await act(async () => preferences.changeFontSize(1));
  assert.equal(preferences.fontSize, 17);
  await act(async () => preferences.resetFontSize());
  assert.equal(preferences.fontSize, 16);
  await act(async () => viewport.resize(1280));
  assert.equal(preferences.fontSize, 16);
  await act(async () => preferences.resetFontSize());
  assert.equal(preferences.fontSize, 10);
});
