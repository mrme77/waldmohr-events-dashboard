import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { OPENROUTER_MODEL, readTranslationCache, translateEvents } from "./homburg-translations.mjs";

const event = { id: "first", originalTitle: "Kinderkonzert", title: "Kinderkonzert", summary: "Musik für Familien." };

/** Returns an OpenRouter-shaped response for the requested batch. */
async function translateBatch(_url, options) {
  const request = JSON.parse(options.body);
  const { items } = JSON.parse(request.messages[1].content);
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({
      items: items.map(({ index }) => ({ index, title: "Children's concert", summary: "Music for families." })),
    }) } }] }),
  };
}

test("saved translations survive a file round trip and skip every request for unchanged recurrences", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "homburg-cache-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "homburg-events.json");
  const first = await translateEvents([event], "test-key", translateBatch);
  await writeFile(file, JSON.stringify(first));
  const saved = await readTranslationCache(file);
  const second = await translateEvents([event, { ...event, id: "next-date" }], "test-key", () => {
    assert.fail("Unchanged text must not trigger a translation request");
  }, saved);
  assert.equal(second.reusedListings, 1);
  assert.equal(second.newlyTranslatedListings, 0);
  assert.equal(second.translatedListings, 1);
  assert.equal(second.events[1].title, "Children's concert");
  assert.equal(JSON.parse(await readFile(file, "utf8")).translationCache.model, OPENROUTER_MODEL);
});

test("only new or edited titles and summaries are sent for translation", async () => {
  const first = await translateEvents([event], "test-key", translateBatch);
  const changedTitle = { ...event, originalTitle: "Neues Konzert", title: "Neues Konzert" };
  const changedSummary = { ...event, summary: "Neue Musik." };
  const newListing = { ...event, originalTitle: "Theater", title: "Theater", summary: "Ein Stück." };
  const result = await translateEvents([event, changedTitle, changedSummary, newListing], "test-key", async (url, options) => {
    const items = JSON.parse(JSON.parse(options.body).messages[1].content).items;
    assert.deepEqual(items.map(({ title, summary }) => [title, summary]), [
      [changedTitle.originalTitle, changedTitle.summary],
      [changedSummary.originalTitle, changedSummary.summary],
      [newListing.originalTitle, newListing.summary],
    ]);
    return translateBatch(url, options);
  }, first.translationCache.items);
  assert.equal(result.reusedListings, 1);
  assert.equal(result.newlyTranslatedListings, 3);
});

test("cached English remains available without an API key while missing text stays German", async () => {
  const first = await translateEvents([event], "test-key", translateBatch);
  const changed = { ...event, summary: "Neue Musik." };
  const result = await translateEvents([event, changed], "", () => assert.fail("No API key"), first.translationCache.items);
  assert.equal(result.events[0].title, "Children's concert");
  assert.equal(result.events[1].summary, changed.summary);
  assert.equal(result.reusedListings, 1);
  assert.equal(result.newlyTranslatedListings, 0);
});

test("failed requests preserve cached translations and retry missing text on the next run", async (t) => {
  t.mock.method(console, "warn", () => {});
  const first = await translateEvents([event], "test-key", translateBatch);
  const changed = { ...event, summary: "Neue Musik." };
  const failed = await translateEvents([event, changed], "test-key", async () => ({ ok: false, status: 503, statusText: "Unavailable" }), first.translationCache.items);
  assert.equal(failed.events[0].title, "Children's concert");
  assert.equal(failed.events[1].summary, changed.summary);
  assert.deepEqual(failed.translationCache, first.translationCache);
  const retry = await translateEvents([event, changed], "test-key", translateBatch, failed.translationCache.items);
  assert.equal(retry.reusedListings, 1);
  assert.equal(retry.newlyTranslatedListings, 1);
});

test("malformed translation results are not cached and successful results survive absent listings", async () => {
  const invalid = await translateEvents([event], "test-key", async () => ({
    ok: true, json: async () => ({ choices: [{ message: { content: '{"items":[{"index":0,"title":"","summary":""}]}' } }] }),
  }));
  assert.equal(invalid.translatedListings, 0);
  assert.deepEqual(invalid.translationCache.items, {});
  const first = await translateEvents([event], "test-key", translateBatch);
  const absent = await translateEvents([], "test-key", () => assert.fail("Empty batch"), first.translationCache.items);
  assert.equal(absent.translatedListings, 0);
  assert.deepEqual(absent.translationCache, first.translationCache);
});

test("cache loading supports missing and legacy files, rejects corruption, and resets for another model", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "homburg-cache-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "homburg-events.json");
  assert.deepEqual(await readTranslationCache(file), {});
  await writeFile(file, '{"events":[]}');
  assert.deepEqual(await readTranslationCache(file), {});
  await writeFile(file, '{');
  await assert.rejects(readTranslationCache(file), /Invalid Homburg translation cache/);
  await writeFile(file, JSON.stringify({ translationCache: { model: OPENROUTER_MODEL, items: { bad: {} } } }));
  await assert.rejects(readTranslationCache(file), /Invalid Homburg translation cache/);
  await writeFile(file, JSON.stringify({ translationCache: { model: "another-model", items: {} } }));
  assert.deepEqual(await readTranslationCache(file), {});
  await assert.rejects(readTranslationCache(directory), /Cannot read Homburg translation cache/);
});
