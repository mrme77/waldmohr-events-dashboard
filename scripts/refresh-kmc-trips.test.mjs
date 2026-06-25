import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkPages,
  normalizeTripIdeas,
  parseJsonObject,
  summarizeTripIdeas,
} from "./refresh-kmc-trips.mjs";

test("chunkPages splits issue pages into fixed-size chunks", () => {
  const pages = Array.from({ length: 7 }, (_, index) => ({ pageNumber: index + 1, lines: [] }));

  assert.deepEqual(
    chunkPages(pages, 3).map((chunk) => chunk.map((page) => page.pageNumber)),
    [[1, 2, 3], [4, 5, 6], [7]]
  );
});

test("normalizeTripIdeas filters malformed items and deduplicates candidates", () => {
  const ideas = normalizeTripIdeas(
    [
      {
        title: "Castle Day Trip",
        summary: "A nearby castle visit with family appeal.",
        location: "Kusel",
        pageNumber: 12,
        category: "day-trip",
        audience: "family",
        dateHint: null,
        confidence: "high",
      },
      {
        title: "Castle Day Trip",
        summary: "Duplicate should be removed.",
        location: "Kusel",
        pageNumber: 12,
        category: "invalid",
        audience: "invalid",
        dateHint: "Saturday",
        confidence: "invalid",
      },
      { title: "", summary: "Missing title", pageNumber: 1 },
    ],
    { sourceUrl: "https://issuu.com/advantinews/docs/current" }
  );

  assert.equal(ideas.length, 1);
  assert.equal(ideas[0].id, "kmc-trip-12-castle-day-trip");
  assert.equal(ideas[0].sourceUrl, "https://issuu.com/advantinews/docs/current#page/12");
  assert.equal(ideas[0].category, "day-trip");
  assert.equal(ideas[0].audience, "family");
  assert.equal(ideas[0].confidence, "high");
});

test("parseJsonObject accepts fenced JSON responses", () => {
  assert.deepEqual(parseJsonObject("```json\n{\"items\":[]}\n```"), { items: [] });
});

test("parseJsonObject extracts JSON from noisy responses", () => {
  assert.deepEqual(parseJsonObject("Here is the result:\n{\"items\":[]}\nDone."), { items: [] });
});

test("summarizeTripIdeas sends OpenRouter request and returns response items", async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [{ title: "Museum", summary: "A useful visit.", pageNumber: 4 }],
                }),
              },
            },
          ],
        };
      },
    };
  };

  const items = await summarizeTripIdeas({
    apiKey: "test-key",
    fetchImpl: fakeFetch,
    issue: {
      sourceUrl: "https://issuu.com/advantinews/docs/current",
      publishDate: "2026-06-25",
    },
    chunk: [{ pageNumber: 4, lines: ["Museum", "Family day trip"] }],
  });

  assert.equal(requests[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(requests[0].body.model, "google/gemini-2.5-flash");
  assert.equal(requests[0].body.response_format.type, "json_object");
  assert.match(requests[0].body.messages[1].content, /Return at most 5 strongest ideas/);
  assert.deepEqual(items, [{ title: "Museum", summary: "A useful visit.", pageNumber: 4 }]);
});

test("summarizeTripIdeas retries once after invalid JSON", async () => {
  const requests = [];
  const fakeFetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: requests.length === 1
                  ? "```json\n```"
                  : JSON.stringify({ items: [{ title: "Hike", summary: "Trail idea.", pageNumber: 2 }] }),
              },
            },
          ],
        };
      },
    };
  };

  const items = await summarizeTripIdeas({
    apiKey: "test-key",
    fetchImpl: fakeFetch,
    issue: {
      sourceUrl: "https://issuu.com/advantinews/docs/current",
      publishDate: "2026-06-25",
    },
    chunk: [{ pageNumber: 2, lines: ["Forest hike"] }],
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[1].temperature, 0);
  assert.equal(requests[1].max_tokens, 1400);
  assert.match(requests[1].messages.at(-1).content, /not parseable JSON/);
  assert.match(requests[1].messages.at(-1).content, /Return at most 3 items/);
  assert.deepEqual(items, [{ title: "Hike", summary: "Trail idea.", pageNumber: 2 }]);
});
