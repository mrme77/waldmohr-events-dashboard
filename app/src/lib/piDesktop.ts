const CHANNEL = "waldmohr-desktop-v1";

/** Requests a fixed action from the locally installed desktop extension.
 * @throws If desktop control is unavailable, times out, or the window cannot be minimized.
 */
export function requestPiDesktop(action: "hello" | "minimize", signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("Desktop request cancelled.")); return; }
    const requestId = crypto.randomUUID();

    /** Releases request listeners and its timeout on every completion path. */
    function cleanup(): void {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      signal?.removeEventListener("abort", onAbort);
    }

    /** Rejects a cancelled request without leaving its response listener active. */
    function onAbort(): void {
      cleanup();
      reject(new Error("Desktop request cancelled."));
    }

    /** Accepts only the response for this action from the dashboard's own window. */
    function onMessage(event: MessageEvent<unknown>): void {
      const data = event.data;
      if (event.source !== window || event.origin !== window.location.origin ||
          typeof data !== "object" || data === null || !("channel" in data) ||
          data.channel !== CHANNEL || !("type" in data) || data.type !== "response" ||
          !("requestId" in data) || data.requestId !== requestId ||
          !("ok" in data) || typeof data.ok !== "boolean") return;
      cleanup();
      if (data.ok) resolve();
      else reject(new Error("message" in data && typeof data.message === "string" ? data.message : "Could not show the Pi desktop."));
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Desktop control did not respond. Reload the dashboard and try again."));
    }, 2_000);
    window.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
    window.postMessage({ channel: CHANNEL, type: "request", action, requestId }, window.location.origin);
  });
}
