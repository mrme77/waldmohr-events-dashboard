import { useEffect, useState } from "react";
import { requestPiDesktop } from "../lib/piDesktop";
import "./DesktopButton.css";

/** Minimizes the dashboard through its local extension, preserving the open page. */
export function DesktopButton() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestPiDesktop("hello", controller.signal).then(
      () => { if (!controller.signal.aborted) setAvailable(true); },
      () => { if (!controller.signal.aborted) setAvailable(false); },
    );
    return () => controller.abort();
  }, []);

  /** Keeps the dashboard open while requesting access to the Pi desktop. */
  async function showDesktop(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await requestPiDesktop("minimize");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not show the Pi desktop.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="desktop-control">
      <button
        className="desktop-control__button"
        type="button"
        disabled={!available || busy}
        onClick={() => void showDesktop()}
        title={available ? "Show the Pi desktop. Return by clicking Chromium on the taskbar." : "Desktop controls need setup on this Pi."}
        aria-label="Show Pi desktop"
        aria-describedby={error ? "desktop-control-error" : undefined}
        aria-busy={busy}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="13" rx="2" />
          <path d="M12 16v5m-4 0h8" />
        </svg>
        <span>{busy ? "Opening desktop" : "Desktop"}</span>
      </button>
      {error && <p id="desktop-control-error" className="desktop-control__error" role="alert">{error}</p>}
    </div>
  );
}
