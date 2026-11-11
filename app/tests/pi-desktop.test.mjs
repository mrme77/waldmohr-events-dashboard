import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

/** Loads the real browser bridge with observable messages and timeout callbacks. */
async function createBridge() {
  const window = new EventTarget();
  window.location = { origin: "http://localhost:8080" };
  const messages = [];
  const timers = new Map();
  let nextId = 0;
  window.setTimeout = (callback) => { timers.set(++nextId, callback); return nextId; };
  window.clearTimeout = (id) => timers.delete(id);
  window.postMessage = (message, origin) => messages.push({ message, origin });
  const source = await readFile(new URL("../src/lib/piDesktop.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  runInNewContext(outputText, { window, crypto: { randomUUID }, exports, Error });
  return {
    request: exports.requestPiDesktop, messages, timers,
    respond(overrides = {}) {
      const event = Object.assign(new Event("message"), {
        source: window, origin: window.location.origin,
        data: { ...messages.at(-1).message, type: "response", ok: true }, ...overrides,
      });
      window.dispatchEvent(event);
    },
  };
}

test("desktop bridge requests only its own origin and cleans up after a matching response", async () => {
  const bridge = await createBridge();
  const pending = bridge.request("minimize");
  assert.equal(bridge.messages[0].origin, "http://localhost:8080");
  assert.equal(bridge.messages[0].message.action, "minimize");
  bridge.respond();
  await pending;
  assert.equal(bridge.timers.size, 0);
});

test("foreign windows, foreign origins, and unmatched responses cannot complete desktop requests", async () => {
  const bridge = await createBridge();
  const pending = bridge.request("hello");
  bridge.respond({ source: {} });
  bridge.respond({ origin: "https://example.com" });
  bridge.respond({ data: { ...bridge.messages[0].message, type: "response", requestId: "wrong", ok: true } });
  assert.equal(bridge.timers.size, 1);
  bridge.respond();
  await pending;
});

test("desktop rejection, timeout, and cancellation report errors and release timers", async () => {
  const bridge = await createBridge();
  const rejected = bridge.request("minimize");
  bridge.respond({ data: { ...bridge.messages.at(-1).message, type: "response", ok: false, message: "Window unavailable" } });
  await assert.rejects(rejected, /Window unavailable/);
  assert.equal(bridge.timers.size, 0);
  const timeout = bridge.request("hello");
  [...bridge.timers.values()][0]();
  await assert.rejects(timeout, /did not respond/);
  const controller = new AbortController();
  const cancelled = bridge.request("hello", controller.signal);
  controller.abort();
  await assert.rejects(cancelled, /cancelled/);
  assert.equal(bridge.timers.size, 0);
  await assert.rejects(bridge.request("hello", controller.signal), /cancelled/);
});
