/** Allows a local dashboard tab to minimize only its own browser window. */
function handleMessage(message, sender, respond) {
  if (sender.id !== chrome.runtime.id || !sender.tab || !Number.isInteger(sender.tab.windowId)) return false;
  try {
    const url = new URL(sender.url);
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname)) return false;
  } catch (error) {
    respond({ ok: false, message: `Invalid dashboard address: ${error.message}` });
    return false;
  }
  if (message?.action === "hello") {
    respond({ ok: true });
    return false;
  }
  if (message?.action !== "minimize") return false;

  chrome.windows.update(sender.tab.windowId, { state: "minimized" }).then(
    () => respond({ ok: true }),
    (error) => respond({ ok: false, message: `Could not show the desktop: ${error.message}` }),
  );
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);
