import type { MouseEvent } from "react";
import "./DesktopButton.css";

const RING_URL = "https://account.ring.com/account/dashboard";

/** Opens Ring itself so credentials and video remain in Ring's browser session. */
export function DoorbellButton() {
  /** Requests a separate window without giving Ring access to the dashboard. */
  function openRing(event: MouseEvent<HTMLAnchorElement>): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const popup = window.open("about:blank", "_blank", "popup,width=1000,height=720");
    if (!popup) return;
    // Sever the opener while the blank page is still ours, before loading Ring.
    popup.opener = null;
    popup.location.replace(RING_URL);
    event.preventDefault();
  }

  return (
    <div className="desktop-control">
      <a
        className="desktop-control__button"
        href={RING_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openRing}
        title="Open Ring's official website in a separate window. Close Live View when finished."
        aria-label="Doorbell: open Ring in a separate window"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="7" y="2" width="10" height="20" rx="4" />
          <circle cx="12" cy="7" r="1" />
          <circle cx="12" cy="16" r="3" />
        </svg>
        <span>Doorbell</span>
      </a>
    </div>
  );
}
