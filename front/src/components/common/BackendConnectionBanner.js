import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, CloudWarning } from "@phosphor-icons/react";
import { apiRequest } from "../../config/api";
import LoadingLogo from "./LoadingLogo";

function BackendConnectionBanner() {
  const [state, setState] = useState("loaded");
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const onConnection = (event) => {
      const detail = event.detail || {};
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (detail.state === "failed") {
        setState("failed");
        setMessage(detail.message || "Unable to connect to the server. Please check your connection and try again.");
        return;
      }
      if (detail.state === "connecting") {
        setState("connecting");
        setMessage("loading");
        return;
      }
      if (detail.activeRequests > 0) return;
      setState("loaded");
      setMessage("loading");
      hideTimerRef.current = window.setTimeout(() => setMessage(""), 1300);
    };
    window.addEventListener("aeropulse:connection", onConnection);
    return () => {
      window.removeEventListener("aeropulse:connection", onConnection);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Verify the deployed API at application startup as well as during normal
    // page requests, so an unreachable backend is never mistaken for a frozen
    // login or blank dashboard.
    // Health is a background hint. Page data requests own the visible
    // connection state; keeping this probe silent prevents a slow cold-start
    // health check from masking a page that has already loaded.
    apiRequest("/health", { silentConnection: true }).catch(() => {});
  }, []);

  const retry = async () => {
    setRetrying(true);
    try {
      await apiRequest("/health", { silentConnection: true });
      window.location.reload();
    } catch (_error) {
      // The shared connection state publishes the user-facing failure message.
    } finally {
      setRetrying(false);
    }
  };

  if (!message) return null;
  const failed = state === "failed";
  return (
    <div className={`backend-connection-banner ${failed ? "is-failed" : ""}`} role={failed ? "alert" : "status"}>
      {failed ? <CloudWarning size={18} weight="fill" /> : <LoadingLogo compact />}
      {failed ? <span>{message}</span> : null}
      {failed ? (
        <button type="button" onClick={retry} disabled={retrying}>
          {retrying ? <LoadingLogo compact label="Retrying connection" /> : <><ArrowClockwise size={15} weight="bold" /> Retry</>}
        </button>
      ) : null}
    </div>
  );
}

export default BackendConnectionBanner;
