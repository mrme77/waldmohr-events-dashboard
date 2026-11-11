import { useEffect, useState } from "react";
import { checkInternet } from "../data/checkInternet";

type ConnectionState = "checking" | "online" | "offline" | "unverified";

interface InternetStatus {
  state: ConnectionState;
  detail: string;
  checkedAt: string | null;
}

const INITIAL_STATUS: InternetStatus = {
  state: "checking", detail: "Checking internet access.", checkedAt: null,
};

/** Checks internet access periodically and immediately when network visibility changes. */
export function useInternetStatus() {
  const [status, setStatus] = useState<InternetStatus>(INITIAL_STATUS);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let active: AbortController | null = null;

    /** Cancels any active check when the browser reports loss of its network. */
    function markOffline(): void {
      active?.abort();
      active = null;
      setStatus({ state: "offline", detail: "The browser reports no network connection.", checkedAt: null });
    }

    /** Rechecks external access without allowing an older request to overwrite newer status. */
    async function refresh(): Promise<void> {
      if (document.visibilityState === "hidden") return;
      if (!navigator.onLine) { markOffline(); return; }
      active?.abort();
      const controller = new AbortController();
      active = controller;
      setStatus((previous) => previous.state === "offline" ? INITIAL_STATUS : previous);
      const timeout = window.setTimeout(() => controller.abort(), 8_000);

      try {
        await checkInternet(controller.signal);
        if (!disposed && active === controller) {
          setStatus({ state: "online", detail: "Internet access verified.", checkedAt: new Date().toISOString() });
        }
      } catch (error: unknown) {
        if (!disposed && active === controller) {
          setStatus({
            state: navigator.onLine ? "unverified" : "offline",
            detail: controller.signal.aborted ? "Internet check timed out." :
              error instanceof Error ? error.message : "Internet access could not be verified.",
            checkedAt: null,
          });
        }
      } finally {
        window.clearTimeout(timeout);
        if (active === controller) active = null;
      }
    }

    /** Starts a check in response to browser events. */
    function recheck(): void { void refresh(); }

    recheck();
    const interval = window.setInterval(recheck, 30_000);
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      disposed = true;
      active?.abort();
      window.clearInterval(interval);
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [attempt]);

  return { ...status, recheck: () => setAttempt((previous) => previous + 1) };
}
