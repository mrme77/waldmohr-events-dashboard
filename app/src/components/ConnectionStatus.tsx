import { useInternetStatus } from "../hooks/useInternetStatus";
import "./ConnectionStatus.css";

/** Shows verified internet reachability, with a touch target for an immediate recheck. */
export function ConnectionStatus() {
  const { state, detail, checkedAt, recheck } = useInternetStatus();
  const label = {
    checking: "Checking internet",
    online: "Internet connected",
    offline: "No network",
    unverified: "Check connection",
  }[state];
  const lastCheck = checkedAt ? ` Last verified at ${new Date(checkedAt).toLocaleTimeString()}.` : "";

  return (
    <button
      type="button"
      className={`connection-status connection-status--${state}`}
      onClick={recheck}
      title={`${detail}${lastCheck} Tap to check again.`}
      aria-label={`${label}. Check internet connection again`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        {state === "offline" && <path d="m3 3 18 18" />}
        {state === "unverified" && <path d="M20 13v3m0 3h.01" />}
      </svg>
      <span role="status" aria-live="polite">{label}</span>
    </button>
  );
}
