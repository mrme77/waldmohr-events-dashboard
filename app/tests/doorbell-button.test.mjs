import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

/** Loads the real control with an observable browser window and no CSS loader. */
async function loadButton(open) {
  const source = await readFile(new URL("../src/components/DoorbellButton.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    window: { open },
    require: (name) => name === "react/jsx-runtime"
      ? { jsx: createElement, jsxs: (type, props) => createElement(type, props) }
      : {},
  });
  return exports.DoorbellButton().props.children;
}

test("Doorbell opens only Ring after severing access to the dashboard", async () => {
  const navigations = [];
  const popup = {
    opener: {},
    location: { replace(url) { assert.equal(popup.opener, null); navigations.push(url); } },
  };
  const link = await loadButton((url, target, features) => {
    assert.equal(url, "about:blank");
    assert.equal(target, "_blank");
    assert.match(features, /popup/);
    return popup;
  });
  let prevented = false;
  link.props.onClick({ preventDefault() { prevented = true; } });
  assert.deepEqual(navigations, ["https://account.ring.com/account/dashboard"]);
  assert.equal(prevented, true);
});

test("blocked popups preserve the official link and safe native navigation", async () => {
  const link = await loadButton(() => null);
  assert.equal(link.type, "a");
  assert.equal(link.props.href, "https://account.ring.com/account/dashboard");
  assert.equal(link.props.target, "_blank");
  assert.equal(link.props.rel, "noopener noreferrer");
  link.props.onClick({ preventDefault() { assert.fail("Blocked popup must retain the link fallback"); } });
});

test("modified clicks keep native browser navigation without opening a popup", async () => {
  const link = await loadButton(() => assert.fail("Modified clicks must use the native link"));
  for (const modifier of ["ctrlKey", "metaKey", "shiftKey", "altKey"]) {
    link.props.onClick({ [modifier]: true, preventDefault() { assert.fail("Keep the native click"); } });
  }
});
