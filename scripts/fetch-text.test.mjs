import assert from "node:assert/strict";
import test from "node:test";

import { fetchText, fetchTextWithRetry } from "./fetch-text.mjs";

test("fetchText returns the response body", async () => {
  const fetchImpl = async () => new Response("issue contents");

  const body = await fetchText("https://example.test/issue", { fetchImpl });

  assert.equal(body, "issue contents");
});

test("fetchText reports the URL when a request times out", async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });

  await assert.rejects(
    fetchText("https://example.test/stalled", { fetchImpl, timeoutMs: 5 }),
    /Timed out fetching https:\/\/example\.test\/stalled after 5ms/
  );
});

test("fetchText includes a nested DNS failure in its error", async () => {
  const dnsError = new Error("getaddrinfo ENOTFOUND www.waldmohr-aktuell.de");
  dnsError.code = "ENOTFOUND";
  const fetchImpl = async () => {
    throw new TypeError("fetch failed", { cause: dnsError });
  };

  await assert.rejects(
    fetchText("https://www.waldmohr-aktuell.de/wp-json/wp/v2/posts", { fetchImpl }),
    /Failed to fetch https:\/\/www\.waldmohr-aktuell\.de\/wp-json\/wp\/v2\/posts: fetch failed: getaddrinfo ENOTFOUND www\.waldmohr-aktuell\.de \(ENOTFOUND\)/
  );
});

test("fetchTextWithRetry retries a transient failure", async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      throw new TypeError("temporary network failure");
    }
    return new Response("recovered");
  };

  const body = await fetchTextWithRetry("https://example.test/retry", {
    fetchImpl,
    retryDelayMs: 0,
  });

  assert.equal(body, "recovered");
  assert.equal(requestCount, 2);
});
