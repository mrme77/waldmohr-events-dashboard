import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});
after(() => server.close());
const { NewsMarquee } = await server.ssrLoadModule("/src/components/NewsMarquee.tsx");

/** Loads a component or hook with controlled effects and timers, without a browser. */
async function loadWithTimers(path) {
  let now = 25_000;
  let state = 0;
  let cleanup;
  let scheduled;
  const exports = {};
  const schedule = (callback, delay) => {
    scheduled = { callback, delay };
    return 1;
  };
  const clear = () => { scheduled = undefined; };
  const react = {
    useState: () => [state, (next) => { state = typeof next === "function" ? next(state) : next; }],
    useEffect: (effect) => { cleanup = effect(); },
  };
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  runInNewContext(outputText, {
    exports,
    require: (name) => name === "react" ? react : { jsx() {}, jsxs() {} },
    Date: class extends Date { static now() { return now; } },
    window: { setTimeout: schedule, clearTimeout: clear, setInterval: schedule, clearInterval: clear },
  });
  return { exports, timer: () => scheduled, state: () => state,
    advance: (value) => { now = value; }, cleanup: () => cleanup?.() };
}

test("news shows one complete headline without a duplicated scrolling track", () => {
  const html = renderToStaticMarkup(createElement(NewsMarquee, {
    items: [{ sourceLabel: "NPR", title: "First headline" }, { sourceLabel: "KSDK", title: "Next headline" }],
  }));
  assert.match(html, /NPR: First headline/);
  assert.doesNotMatch(html, /Next headline|marquee__track|aria-hidden/);
});

test("empty news renders loading or error text", () => {
  assert.match(renderToStaticMarkup(createElement(NewsMarquee)), /Loading USA and St. Louis headlines/);
  assert.match(renderToStaticMarkup(createElement(NewsMarquee, { items: [], error: "Offline" })), /News feed unavailable/);
});

test("headline rotation wraps after 30 seconds and releases its timer", async () => {
  const harness = await loadWithTimers("../src/components/NewsMarquee.tsx");
  harness.exports.NewsMarquee({ items: [{ title: "First" }, { title: "Second" }] });
  assert.equal(harness.timer().delay, 30_000);
  harness.timer().callback();
  assert.equal(harness.state(), 1);
  harness.timer().callback();
  assert.equal(harness.state(), 0);
  harness.cleanup();
  assert.equal(harness.timer(), undefined);
});

test("empty or single-headline feeds do not schedule rotation", async () => {
  for (const items of [[], [{ title: "Only headline" }]]) {
    const harness = await loadWithTimers("../src/components/NewsMarquee.tsx");
    harness.exports.NewsMarquee({ items });
    assert.equal(harness.timer(), undefined);
  }
});

test("minute ticks align with wall time and recover after delayed callbacks", async () => {
  const harness = await loadWithTimers("../src/hooks/useNow.ts");
  harness.exports.useNow(60_000);
  assert.equal(harness.timer().delay, 35_000);
  harness.advance(62_000);
  harness.timer().callback();
  assert.equal(harness.timer().delay, 58_000);
  harness.cleanup();
  assert.equal(harness.timer(), undefined);
});
