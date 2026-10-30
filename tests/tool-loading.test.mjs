import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import TestRenderer from "react-test-renderer";
import { compileModules } from "./helpers/compile-modules.mjs";

const { require, cleanup } = compileModules([
  "components/common/RetryableTool.tsx",
  "components/common/ToolErrorBoundary.tsx",
  "components/common/ToolLoadError.tsx",
  "components/common/StatusMessage.tsx",
  "i18n/LanguageProvider.tsx",
  "hooks/useStoredState.ts",
]);
const RetryableTool = require("./components/common/RetryableTool.js").default;
const { LanguageProvider } = require("./i18n/LanguageProvider.js");
const { act, create } = TestRenderer;
const h = React.createElement;
const originalDocument = globalThis.document;
before(() => {
  globalThis.document = { documentElement: { lang: "en" } };
});
after(() => {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  cleanup();
});
function Counter() {
  const [count, setCount] = React.useState(0);
  return h(
    "button",
    { id: "other-tool", onClick: () => setCount(count + 1) },
    `Other tool: ${count}`,
  );
}
const renderApp = (load) =>
  h(
    LanguageProvider,
    null,
    h(
      "div",
      null,
      h(Counter),
      h(RetryableTool, { load }, (Tool) => h(Tool)),
    ),
  );

test("failed lazy imports show a panel error and retry with a fresh loader while sibling state survives", async (t) => {
  t.mock.method(console, "error", () => {}); // React reports this deliberately rejected import.
  let attempts = 0;
  let rejectFirst;
  const load = () => {
    attempts++;
    return attempts === 1
      ? new Promise((_, reject) => {
          rejectFirst = reject;
        })
      : Promise.resolve({ default: () => h("p", null, "Recovered tool") });
  };
  let renderer;
  try {
    await act(async () => {
      renderer = create(renderApp(load));
    });
    assert.match(
      renderer.root.findByProps({ role: "status" }).children.join(""),
      /Loading tool/,
    );
    await act(async () => {
      renderer.root.findByProps({ id: "other-tool" }).props.onClick();
      rejectFirst(new Error("Chunk download failed"));
    });
    assert.equal(attempts, 1);
    assert.ok(renderer.root.findByProps({ role: "alert" }));
    assert.equal(
      renderer.root.findByProps({ id: "other-tool" }).children[0],
      "Other tool: 1",
    );
    const retry = renderer.root
      .findAllByType("button")
      .find((button) => button.children.join("") === "Try again");
    await act(async () => {
      retry.props.onClick();
    });
    assert.equal(attempts, 2);
    assert.equal(renderer.root.findAllByProps({ role: "alert" }).length, 0);
    assert.ok(
      renderer.root
        .findAllByType("p")
        .some((node) => node.children.includes("Recovered tool")),
    );
    assert.equal(
      renderer.root.findByProps({ id: "other-tool" }).children[0],
      "Other tool: 1",
    );
  } finally {
    if (renderer)
      await act(async () => {
        renderer.unmount();
      });
  }
});

test("tool render exceptions are contained and repeated retry failures remain recoverable", async (t) => {
  t.mock.method(console, "error", () => {});
  let attempts = 0;
  const load = async () => {
    attempts++;
    return {
      default: () => {
        throw new Error("Invalid tool data");
      },
    };
  };
  let renderer;
  try {
    await act(async () => {
      renderer = create(renderApp(load));
    });
    assert.ok(renderer.root.findByProps({ role: "alert" }));
    await act(async () => {
      renderer.root.findByProps({ id: "other-tool" }).props.onClick();
    });
    for (let index = 0; index < 2; index++) {
      const retry = renderer.root
        .findAllByType("button")
        .find((button) => button.children.join("") === "Try again");
      await act(async () => {
        retry.props.onClick();
      });
      assert.ok(renderer.root.findByProps({ role: "alert" }));
    }
    assert.equal(attempts, 3);
    assert.equal(
      renderer.root.findByProps({ id: "other-tool" }).children[0],
      "Other tool: 1",
    );
  } finally {
    if (renderer)
      await act(async () => {
        renderer.unmount();
      });
  }
});
