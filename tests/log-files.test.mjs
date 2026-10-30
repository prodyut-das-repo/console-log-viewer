import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer from "react-test-renderer";
import { compileModules } from "./helpers/compile-modules.mjs";

const { require, cleanup } = compileModules([
  "App.tsx",
  "hooks/useLogFiles.ts",
  "hooks/useHarFiles.ts",
  "hooks/useStoredState.ts",
  "hooks/useMediaQuery.ts",
  "providers/ClipboardProvider.tsx",
  "providers/PreferencesProvider.tsx",
  "i18n/LanguageProvider.tsx",
  "components/common/Toast.tsx",
  "components/common/Icon.tsx",
  "components/common/FontSizeControl.tsx",
  "components/common/RetryableTool.tsx",
  "components/common/ToolErrorBoundary.tsx",
  "components/common/ToolLoadError.tsx",
  "components/common/StatusMessage.tsx",
  "components/layout/AppHeader.tsx",
  "components/layout/FileNavigation.tsx",
  "components/layout/Sidebar.tsx",
  "components/layout/SidebarFileList.tsx",
  "components/layout/ToolTabs.tsx",
  "components/layout/ToolHeading.tsx",
  "components/layout/tools.ts",
  "features/console/ConsoleEmptyState.tsx",
  "features/console/ConsoleViewer.tsx",
  "features/console/ConsoleToolbar.tsx",
  "features/console/LogRows.tsx",
  "features/console/LogStats.tsx",
  "features/console/useLogView.ts",
  "utils/download.ts",
  "utils/format.ts",
  "utils/log.ts",
]);
const App = require("./App.js").default;
const { useLogFiles } = require("./hooks/useLogFiles.js");
const { ClipboardProvider } = require("./providers/ClipboardProvider.js");
const { PreferencesProvider } = require("./providers/PreferencesProvider.js");
const { LanguageProvider } = require("./i18n/LanguageProvider.js");
const ConsoleEmptyState =
  require("./features/console/ConsoleEmptyState.js").default;
const ToolHeading = require("./components/layout/ToolHeading.js").default;
const Sidebar = require("./components/layout/Sidebar.js").default;
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

async function mountLogFiles(context) {
  let state;
  let renderer;
  function Harness() {
    state = useLogFiles();
    return h(ToolHeading, {
      activeTool: "console",
      onOpen: () => {},
      hasLogFiles: state.files.length > 0,
    });
  }
  await act(async () => {
    renderer = create(providers(h(Harness)));
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
  });
  return {
    renderer,
    get state() {
      return state;
    },
  };
}

test("removing files preserves other files and selects a neighbor when needed", async (context) => {
  const app = await mountLogFiles(context);
  await act(async () => {
    await app.state.openFiles(
      ["first", "second", "third", "fourth"].map(
        (name) => new File([`INFO ${name}`], `${name}.log`),
      ),
    );
  });
  const [first, second, third, fourth] = app.state.files;
  await act(async () => {
    app.state.setActiveId(second.id);
    app.state.updateFile(second.id, { query: "second", filter: "info" });
    app.state.removeFile(first.id);
  });
  assert.equal(app.state.activeId, second.id);
  assert.equal(app.state.activeFile.query, "second");
  assert.equal(app.state.activeFile.filter, "info");
  assert.deepEqual(
    app.state.files.map((file) => file.id),
    [second.id, third.id, fourth.id],
  );
  await act(async () => app.state.removeFile(second.id));
  assert.equal(app.state.activeId, third.id);
  await act(async () => {
    app.state.setActiveId(fourth.id);
    app.state.removeFile(fourth.id);
  });
  assert.equal(app.state.activeId, third.id);
  await act(async () => {
    app.state.removeFile(third.id);
    app.state.removeFile("missing");
    app.state.setActiveId(second.id);
  });
  assert.deepEqual(app.state.files, []);
  assert.equal(app.state.activeId, null);
  assert.equal(app.state.activeFile, null);
  assert.equal(app.renderer.root.findAllByType("button").length, 0);
});

test("replacing the active file preserves its position and resets its filters", async (context) => {
  const app = await mountLogFiles(context);
  await act(async () => {
    await app.state.openFiles([
      new File(["ERROR first"], "first.log"),
      new File(["INFO second"], "second.log"),
    ]);
  });
  const [first, second] = app.state.files;
  const replacement = new File(["WARN replacement"], "replacement.txt");
  await act(async () => {
    app.state.setActiveId(first.id);
    app.state.updateFile(first.id, { filter: "error", query: "first" });
  });
  await act(async () => {
    await app.state.replaceFile(first.id, replacement);
  });
  assert.equal(app.state.activeId, first.id);
  assert.deepEqual(
    app.state.files.map((file) => file.id),
    [first.id, second.id],
  );
  assert.deepEqual(app.state.activeFile, {
    id: first.id,
    name: "replacement.txt",
    size: replacement.size,
    text: "WARN replacement",
    filter: "all",
    query: "",
  });
  assert.equal(app.state.files[1], second);
  await act(async () => {
    await app.state.openFiles([new File(["INFO appended"], "appended.log")]);
  });
  assert.deepEqual(
    app.state.files.map((file) => file.name),
    ["replacement.txt", "second.log", "appended.log"],
  );
  assert.equal(app.state.activeFile.name, "appended.log");
});

test("an unreadable replacement retains the existing file and its filters", async (context) => {
  const app = await mountLogFiles(context);
  await act(async () => {
    await app.state.openFiles([new File(["ERROR original"], "original.log")]);
  });
  await act(async () =>
    app.state.updateFile(app.state.activeId, {
      query: "original",
      filter: "error",
    }),
  );
  const original = app.state.activeFile;
  await act(async () => {
    await app.state.replaceFile(original.id, {
      name: "broken.log",
      size: 1,
      text: async () => {
        throw new Error("Read failed");
      },
    });
  });
  assert.equal(app.state.activeFile, original);
  assert.deepEqual(app.state.files, [original]);
  assert.match(
    app.renderer.root.findByProps({ role: "status" }).children.join(""),
    /could not be read/,
  );
});

test("a pending replacement keeps its target when selection changes and cannot restore a removed file", async (context) => {
  const app = await mountLogFiles(context);
  await act(async () => {
    await app.state.openFiles([
      new File(["INFO first"], "first.log"),
      new File(["INFO second"], "second.log"),
    ]);
  });
  const [first, second] = app.state.files;
  let finishRead;
  const delayed = {
    name: "replacement.log",
    size: 4,
    text: () =>
      new Promise((resolve) => {
        finishRead = resolve;
      }),
  };
  const pending = app.state.replaceFile(first.id, delayed);
  await act(async () => app.state.setActiveId(second.id));
  await act(async () => {
    finishRead("WARN");
    await pending;
  });
  assert.equal(app.state.files[0].name, "replacement.log");
  assert.equal(app.state.activeFile, second);
  const removedPending = app.state.replaceFile(first.id, delayed);
  await act(async () => app.state.removeFile(first.id));
  await act(async () => {
    finishRead("WARN");
    await removedPending;
  });
  assert.deepEqual(app.state.files, [second]);
  assert.equal(app.state.activeId, second.id);
});

test("the sidebar appends, the heading replaces, and each file can be removed independently", async (context) => {
  let renderer;
  const openedPickers = [];
  await act(async () => {
    renderer = create(providers(h(App)), {
      createNodeMock: (element) =>
        element.type === "input" && element.props.type === "file"
          ? {
              click: () =>
                openedPickers.push(
                  element.props.accept
                    ? "har"
                    : element.props.multiple
                      ? "append"
                      : "replace",
                ),
            }
          : null,
    });
  });
  context.after(async () => {
    await act(async () => renderer.unmount());
  });
  const sidebar = () => renderer.root.findByType(Sidebar);
  const heading = () => renderer.root.findByType(ToolHeading);
  const logNames = () => sidebar().props.logFiles.map((file) => file.name);
  const inputs = renderer.root.findAllByProps({ type: "file" });
  const appendInput = inputs.find(
    (input) => input.props.multiple && !input.props.accept,
  );
  const replaceInput = inputs.find(
    (input) => !input.props.multiple && !input.props.accept,
  );
  const upload = async (input, name) => {
    await act(async () => {
      input.props.onChange({
        currentTarget: {
          files: [{ name, size: 4, text: async () => "INFO" }],
          value: "selected",
        },
      });
    });
  };
  await act(async () =>
    renderer.root
      .findByType(ConsoleEmptyState)
      .findByType("button")
      .props.onClick(),
  );
  assert.equal(openedPickers.at(-1), "append");
  await upload(appendInput, "first.log");
  await act(async () =>
    sidebar()
      .findByProps({ "aria-label": "LOG FILES" })
      .findAllByType("button")
      .at(-1)
      .props.onClick(),
  );
  assert.equal(openedPickers.at(-1), "append");
  await upload(appendInput, "second.log");
  assert.deepEqual(logNames(), ["first.log", "second.log"]);
  const [first, second] = sidebar().props.logFiles;
  await act(async () => heading().findByType("button").props.onClick());
  assert.equal(openedPickers.at(-1), "replace");
  await upload(replaceInput, "replacement.log");
  assert.deepEqual(logNames(), ["first.log", "replacement.log"]);
  assert.equal(sidebar().props.activeLogId, second.id);
  await act(async () => heading().findByType("button").props.onClick());
  await act(async () =>
    sidebar().findByProps({ title: "first.log" }).props.onClick(),
  );
  await upload(replaceInput, "captured-target.log");
  assert.deepEqual(logNames(), ["first.log", "captured-target.log"]);
  assert.equal(sidebar().props.activeLogId, first.id);
  const remove = sidebar().findByProps({
    "aria-label": "Remove captured-target.log",
  });
  assert.equal(remove.findAllByType("button").length, 1);
  assert.equal(remove.parent.type, "div");
  await act(async () => remove.props.onClick());
  assert.deepEqual(logNames(), ["first.log"]);
  assert.equal(sidebar().props.activeLogId, first.id);
  await act(async () =>
    sidebar().findByProps({ "aria-label": "Remove first.log" }).props.onClick(),
  );
  assert.deepEqual(logNames(), []);
  assert.equal(heading().findAllByType("button").length, 0);
  assert.ok(renderer.root.findByType(ConsoleEmptyState));
});

test("log files start empty and uploading multiple files preserves each file's filters", async () => {
  let state;
  let renderer;
  function Harness() {
    state = useLogFiles();
    return h(ToolHeading, {
      activeTool: "console",
      onOpen: () => {},
      hasLogFiles: state.files.length > 0,
    });
  }
  try {
    await act(async () => {
      renderer = create(providers(h(Harness)));
    });
    assert.deepEqual(state.files, []);
    assert.equal(state.activeId, null);
    assert.equal(state.activeFile, null);
    assert.equal(renderer.root.findAllByType("button").length, 0);
    await act(async () => {
      assert.equal(await state.openFiles([]), false);
    });
    assert.equal(state.activeFile, null);
    assert.equal(renderer.root.findAllByType("button").length, 0);
    const first = new File(["INFO first\nERROR failure"], "first.log");
    const second = new File(["WARN second"], "second.log");
    await act(async () => {
      assert.equal(await state.openFiles([first, second]), true);
    });
    assert.deepEqual(
      state.files.map((file) => file.name),
      ["first.log", "second.log"],
    );
    assert.equal(state.activeFile.name, "second.log");
    assert.ok(
      renderer.root.findByType("button").children.includes("Upload log file"),
    );
    const firstId = state.files[0].id;
    const secondId = state.files[1].id;
    await act(async () => {
      state.setActiveId(firstId);
      state.updateFile(firstId, { query: "failure", filter: "error" });
    });
    assert.equal(state.activeFile.text, "INFO first\nERROR failure");
    await act(async () => {
      state.setActiveId(secondId);
    });
    assert.equal(state.activeFile.query, "");
    assert.equal(state.activeFile.filter, "all");
    await act(async () => {
      state.setActiveId(firstId);
    });
    assert.equal(state.activeFile.query, "failure");
    assert.equal(state.activeFile.filter, "error");
  } finally {
    if (renderer)
      await act(async () => {
        renderer.unmount();
      });
  }
});

test("an unreadable first upload keeps the empty state and reports the read error", async () => {
  let state;
  let renderer;
  function Harness() {
    state = useLogFiles();
    return h(ToolHeading, {
      activeTool: "console",
      onOpen: () => {},
      hasLogFiles: state.files.length > 0,
    });
  }
  try {
    await act(async () => {
      renderer = create(providers(h(Harness)));
    });
    await act(async () => {
      assert.equal(
        await state.openFiles([
          {
            name: "unreadable.log",
            size: 1,
            text: async () => {
              throw new Error("Read failed");
            },
          },
        ]),
        false,
      );
    });
    assert.deepEqual(state.files, []);
    assert.equal(state.activeFile, null);
    assert.equal(renderer.root.findAllByType("button").length, 0);
    assert.match(
      renderer.root.findByProps({ role: "status" }).children.join(""),
      /could not be read/,
    );
  } finally {
    if (renderer)
      await act(async () => {
        renderer.unmount();
      });
  }
});

test("the empty console offers upload and accepts dropped files", async () => {
  let renderer;
  let openCount = 0;
  let dropped = [];
  const files = [
    new File(["INFO first"], "first.log"),
    new File(["WARN second"], "second.log"),
  ];
  try {
    await act(async () => {
      renderer = create(
        providers(
          h(ConsoleEmptyState, {
            onOpen: () => openCount++,
            onOpenFiles: async (files) => {
              dropped = files;
            },
          }),
        ),
      );
    });
    const upload = renderer.root.findByType("button");
    assert.ok(upload.children.includes("Upload log file"));
    assert.equal(upload.props.className, "upload");
    assert.equal(
      renderer.root.findByType("b").children.join(""),
      "No file loaded",
    );
    await act(async () => {
      upload.props.onClick();
    });
    assert.equal(openCount, 1);
    await act(async () => {
      renderer.root
        .findByType("section")
        .props.onDragOver({ preventDefault() {} });
    });
    assert.match(renderer.root.findByType("section").props.className, /drag/);
    await act(async () => {
      renderer.root
        .findByType("section")
        .props.onDrop({ preventDefault() {}, dataTransfer: { files } });
    });
    assert.deepEqual(dropped, files);
    assert.ok(
      !renderer.root.findByType("section").props.className.includes("drag"),
    );
  } finally {
    if (renderer)
      await act(async () => {
        renderer.unmount();
      });
  }
});
