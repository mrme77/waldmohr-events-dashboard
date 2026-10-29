import { readFile } from "node:fs/promises";

/** Model used for new translations and saved-cache compatibility. */
export const OPENROUTER_MODEL = "minimax/minimax-m3.1-flash";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const TRANSLATION_BATCH_SIZE = 20;

/** Reads saved translations; missing or legacy payloads start with an empty cache. */
export async function readTranslationCache(file) {
  let body;
  try {
    body = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`Cannot read Homburg translation cache: ${error.message}`, { cause: error });
  }
  try {
    const cache = JSON.parse(body).translationCache;
    if (cache === undefined) return {};
    if (!cache || typeof cache.model !== "string" || !cache.items || typeof cache.items !== "object" || Array.isArray(cache.items)) {
      throw new Error("invalid cache structure");
    }
    for (const [key, value] of Object.entries(cache.items)) {
      const original = JSON.parse(key);
      if (!Array.isArray(original) || original.length !== 2 || !original.every((part) => typeof part === "string") ||
          typeof value?.title !== "string" || !value.title.trim() || typeof value.summary !== "string" || !value.summary.trim()) {
        throw new Error("invalid cached translation");
      }
    }
    return cache.model === OPENROUTER_MODEL ? cache.items : {};
  } catch (error) {
    // Avoid silently replacing an unreadable cache with another round of paid requests.
    throw new Error(`Invalid Homburg translation cache: ${error.message}`, { cause: error });
  }
}

/** Returns a stable key for one translatable official listing. */
function translationKey(event) {
  return JSON.stringify([event.originalTitle, event.summary]);
}

/** Reuses saved translations and translates only missing listings, retaining German on failure. */
export async function translateEvents(events, apiKey, fetchImpl = fetch, cachedTranslations = {}) {
  const distinct = [...new Map(events.map((event) => [translationKey(event), event])).values()];
  const translations = new Map(Object.entries(cachedTranslations));
  const pending = distinct.filter((event) => !translations.has(translationKey(event)));
  const reusedListings = distinct.length - pending.length;
  if (apiKey) {
    for (let offset = 0; offset < pending.length; offset += TRANSLATION_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + TRANSLATION_BATCH_SIZE);
      try {
        const response = await fetchImpl(OPENROUTER_CHAT_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://github.com/mrme77/waldmohr-events-dashboard", "X-Title": "waldmohr-events-dashboard" },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Translate German municipal event listings into concise US English. Preserve names, dates, times, and factual meaning. Return JSON only." },
              { role: "user", content: JSON.stringify({ items: batch.map((event, index) => ({ index, title: event.originalTitle, summary: event.summary })), response: { items: [{ index: 0, title: "English title", summary: "English summary" }] } }) },
            ],
          }),
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const content = (await response.json())?.choices?.[0]?.message?.content;
        const results = typeof content === "string" ? JSON.parse(content).items : null;
        if (!Array.isArray(results)) throw new Error("response did not contain translation items");
        for (const result of results) {
          if (!Number.isInteger(result?.index) || typeof result.title !== "string" || typeof result.summary !== "string") continue;
          const source = batch[result.index];
          if (source && result.title.trim() && result.summary.trim()) translations.set(translationKey(source), { title: result.title.trim(), summary: result.summary.trim() });
        }
      } catch (error) {
        console.warn(`Homburg translation batch ${offset / TRANSLATION_BATCH_SIZE + 1} skipped: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const translatedEvents = events.map((event) => {
    const translated = translations.get(translationKey(event));
    return translated ? { ...event, title: translated.title, summary: translated.summary } : event;
  });
  const translatedListings = distinct.filter((event) => translations.has(translationKey(event))).length;
  return {
    events: translatedEvents,
    translatedListings,
    reusedListings,
    newlyTranslatedListings: translatedListings - reusedListings,
    totalListings: distinct.length,
    translationCache: { model: OPENROUTER_MODEL, items: Object.fromEntries(translations) },
  };
}
