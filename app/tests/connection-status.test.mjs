import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

/** Loads production TypeScript with controlled browser APIs and dependencies. */
async function loadModule(path, globals) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  runInNewContext(outputText, { exports, Error, ...globals });
  return exports;
}

/** Starts the actual hook with observable state, events, timers, and pending checks. */
async function startHook(online = true) {
  const states = [];
  const requests = [];
  const timers = new Map();
  let cleanup;
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const navigator = { onLine: online };
  let nextId = 0;
  window.setTimeout = window.setInterval = (callback, delay) => {
    timers.set(++nextId, { callback, delay });
    return nextId;
  };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  const react = {
    useState(initial) {
      const index = states.length;
      states.push(initial);
      return [initial, (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useEffect(effect) { cleanup = effect(); },
  };
  const { useInternetStatus } = await loadModule("../src/hooks/useInternetStatus.ts", {
    window, document, navigator, AbortController,
    require: (name) => name === "react" ? react : {
      checkInternet: (signal) => new Promise((resolve, reject) => {
        requests.push({ signal, resolve, reject });
        signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
      }),
    },
  });
  useInternetStatus();
  return { state: () => states[0], window, document, navigator, requests, timers, cleanup: () => cleanup() };
}

/** Flushes async request completions before observing hook state. */
async function settle() { await new Promise((resolve) => setImmediate(resolve)); }

test("internet verification requires a successful, valid external response and bypasses cache", async () => {
  const signal = new AbortController().signal;
  const { checkInternet } = await loadModule("../src/data/checkInternet.ts", {
    fetch: async (url, options) => {
      assert.match(url, /^https:\/\/api\.open-meteo\.com\//);
      assert.equal(options.cache, "no-store");
      assert.equal(options.signal, signal);
      return { ok: true, json: async () => ({ current: { temperature_2m: 10 } }) };
    },
  });
  await checkInternet(signal);
});

test("HTTP errors, malformed responses, and network failures cannot verify internet", async () => {
  for (const response of [
    { ok: false, status: 503 },
    { ok: true, json: async () => ({ login: "Captive portal" }) },
    { ok: true, json: async () => { throw new SyntaxError("Invalid JSON"); } },
    null,
  ]) {
    const { checkInternet } = await loadModule("../src/data/checkInternet.ts", {
      fetch: async () => { if (!response) throw new TypeError("Network unavailable"); return response; },
    });
    await assert.rejects(checkInternet(new AbortController().signal));
  }
});

test("startup verifies internet, polls every 30 seconds, and releases timers and listeners", async () => {
  const hook = await startHook();
  assert.equal(hook.state().state, "checking");
  assert.ok([...hook.timers.values()].some((timer) => timer.delay === 30_000));
  hook.requests[0].resolve();
  await settle();
  assert.equal(hook.state().state, "online");
  assert.ok(hook.state().checkedAt);
  hook.cleanup();
  assert.equal(hook.timers.size, 0);
  hook.window.dispatchEvent(new Event("online"));
  assert.equal(hook.requests.length, 1);
});

test("offline startup makes no external request and reconnecting verifies access", async () => {
  const hook = await startHook(false);
  assert.equal(hook.state().state, "offline");
  assert.equal(hook.requests.length, 0);
  hook.navigator.onLine = true;
  hook.window.dispatchEvent(new Event("online"));
  assert.equal(hook.state().state, "checking");
  hook.requests[0].resolve();
  await settle();
  assert.equal(hook.state().state, "online");
  hook.cleanup();
});

test("timeouts produce an unverified connection and abort outstanding requests", async () => {
  const hook = await startHook();
  [...hook.timers.values()].find((timer) => timer.delay === 8_000).callback();
  await settle();
  assert.equal(hook.requests[0].signal.aborted, true);
  assert.equal(hook.state().state, "unverified");
  assert.match(hook.state().detail, /timed out/);
  hook.cleanup();
});

test("offline events cancel in-flight checks and hidden pages skip requests until visible", async () => {
  const hook = await startHook();
  hook.navigator.onLine = false;
  hook.window.dispatchEvent(new Event("offline"));
  await settle();
  assert.equal(hook.state().state, "offline");
  assert.equal(hook.requests[0].signal.aborted, true);
  hook.navigator.onLine = true;
  hook.document.visibilityState = "hidden";
  hook.window.dispatchEvent(new Event("online"));
  assert.equal(hook.requests.length, 1);
  hook.document.visibilityState = "visible";
  hook.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(hook.requests.length, 2);
  hook.requests[1].resolve();
  await settle();
  assert.equal(hook.state().state, "online");
  hook.cleanup();
});
