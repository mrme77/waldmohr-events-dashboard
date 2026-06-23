/**
 * Fetches a text resource with a deadline and descriptive errors.
 *
 * @param {string} url Resource URL.
 * @param {object} [options] Request options.
 * @param {Record<string, string>} [options.headers] Request headers.
 * @param {number} [options.timeoutMs=20000] Maximum request duration.
 * @param {typeof fetch} [options.fetchImpl=fetch] Fetch implementation for testing.
 * @returns {Promise<string>} Response body text.
 */
export async function fetchText(
  url,
  { headers = {}, timeoutMs = 20_000, fetchImpl = fetch } = {}
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive number.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out fetching ${url} after ${timeoutMs}ms.`, { cause: error });
    }
    if (error instanceof Error && error.message.startsWith(`Failed to fetch ${url}:`)) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch ${url}: ${reason}`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retries a bounded text request after transient failures.
 *
 * @param {string} url Resource URL.
 * @param {object} [options] Request and retry options.
 * @param {Record<string, string>} [options.headers] Request headers.
 * @param {number} [options.timeoutMs=20000] Maximum duration per attempt.
 * @param {number} [options.attempts=2] Total request attempts.
 * @param {number} [options.retryDelayMs=500] Delay between attempts.
 * @param {typeof fetch} [options.fetchImpl=fetch] Fetch implementation for testing.
 * @returns {Promise<string>} Response body text.
 */
export async function fetchTextWithRetry(
  url,
  {
    headers = {},
    timeoutMs = 20_000,
    attempts = 2,
    retryDelayMs = 500,
    fetchImpl = fetch,
  } = {}
) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive integer.");
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchText(url, { headers, timeoutMs, fetchImpl });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${reason} Request failed after ${attempts} attempts.`, { cause: lastError });
}
