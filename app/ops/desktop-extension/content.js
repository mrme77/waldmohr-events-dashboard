const CHANNEL = "waldmohr-desktop-v1";

/** Passes fixed dashboard actions to the extension and returns explicit success or failure. */
async function forwardRequest(event) {
  const message = event.data;
  if (event.source !== window || event.origin !== window.location.origin ||
      message?.channel !== CHANNEL || message.type !== "request" ||
      typeof message.requestId !== "string" || !["hello", "minimize"].includes(message.action)) return;

  let result;
  try {
    result = await chrome.runtime.sendMessage({ action: message.action });
    if (!result || typeof result.ok !== "boolean") throw new Error("Desktop control did not respond.");
  } catch (error) {
    result = { ok: false, message: `Desktop control is unavailable: ${error.message}` };
  }
  window.postMessage({ channel: CHANNEL, type: "response", requestId: message.requestId, ...result }, window.location.origin);
}

window.addEventListener("message", forwardRequest);
