import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

/** Loads extension scripts with controlled Chromium APIs. */
async function loadExtension(file, globals) {
  const source = await readFile(new URL(`../ops/desktop-extension/${file}`, import.meta.url), "utf8");
  runInNewContext(source, { URL, Error, ...globals });
}

test("extension permits only loopback HTTP pages and requests no browser-wide permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("../ops/desktop-extension/manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.content_scripts[0].matches, ["http://localhost/*", "http://127.0.0.1/*"]);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
});

test("desktop extension minimizes only the sending local tab's window and propagates failures", async () => {
  let handler;
  let fail = false;
  const updates = [];
  await loadExtension("background.js", { chrome: {
    runtime: { id: "local-extension", onMessage: { addListener(listener) { handler = listener; } } },
    windows: { async update(id, options) {
      if (fail) throw new Error("Cannot minimize");
      updates.push({ id, state: options.state });
    } },
  } });
  const sender = { id: "local-extension", url: "http://localhost:8080/", tab: { windowId: 7 } };
  let response;
  handler({ action: "hello" }, sender, (value) => { response = value; });
  assert.equal(response.ok, true);
  assert.equal(updates.length, 0);
  assert.equal(handler({ action: "minimize", windowId: 999 }, sender, (value) => { response = value; }), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(updates, [{ id: 7, state: "minimized" }]);
  assert.equal(response.ok, true);
  fail = true;
  handler({ action: "minimize" }, sender, (value) => { response = value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(response.ok, false);
  assert.match(response.message, /Cannot minimize/);
  for (const invalid of [
    { ...sender, id: "other-extension" },
    { ...sender, url: "https://example.com/" },
    { ...sender, url: "http://localhost.example.com/" },
    { ...sender, tab: undefined },
  ]) {
    assert.equal(handler({ action: "minimize" }, invalid, () => assert.fail("Invalid sender accepted")), false);
  }
  assert.equal(handler({ action: "run-command" }, sender, () => assert.fail("Unknown action accepted")), false);
});

test("content bridge accepts same-window requests only and returns runtime errors", async () => {
  let handler;
  let fail = false;
  const calls = [];
  const responses = [];
  const window = {
    location: { origin: "http://localhost:8080" },
    addEventListener(_name, callback) { handler = callback; },
    postMessage(message, origin) { responses.push({ message, origin }); },
  };
  await loadExtension("content.js", { window, chrome: { runtime: {
    async sendMessage(message) {
      if (fail) throw new Error("Extension reloaded");
      calls.push(message.action);
      return { ok: true };
    },
  } } });
  const event = { source: window, origin: window.location.origin,
    data: { channel: "waldmohr-desktop-v1", type: "request", requestId: "123", action: "minimize" } };
  await handler({ ...event, origin: "https://example.com" });
  await handler({ ...event, source: {} });
  await handler({ ...event, data: { ...event.data, action: "run-command" } });
  assert.equal(calls.length, 0);
  await handler(event);
  assert.deepEqual(calls, ["minimize"]);
  assert.equal(responses[0].message.ok, true);
  assert.equal(responses[0].origin, window.location.origin);
  fail = true;
  await handler(event);
  assert.equal(responses[1].message.ok, false);
  assert.match(responses[1].message.message, /Extension reloaded/);
});
