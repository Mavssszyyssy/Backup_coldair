import { AppState } from "react-native";
import { subscribeNotificationChanges } from "./notificationEvents";

export const LIVE_REFRESH_INTERVAL_MS = 10000;

// Start inside a screen's focus effect and return/call the cleanup on blur.
// Never starts a payment, generates an AI report, or changes server records.
export function startLiveRefresh(load, { intervalMs = LIVE_REFRESH_INTERVAL_MS } = {}) {
  let disposed = false;
  let foreground = !["background", "inactive"].includes(AppState.currentState);
  let running = false;
  let queued = false;
  let first = true;
  const isCurrent = () => !disposed && foreground;
  const refresh = async (event = false) => {
    if (!isCurrent()) return;
    if (running) { if (event) queued = true; return; }
    running = true;
    const background = !first;
    first = false;
    try { await load({ background, isCurrent }); }
    catch { /* Keep the last visible data; retry on the next refresh. */ }
    finally {
      running = false;
      if (queued && isCurrent()) { queued = false; void refresh(); }
    }
  };
  const timer = setInterval(() => { void refresh(); }, intervalMs);
  const unsubscribe = subscribeNotificationChanges(() => { void refresh(true); });
  const app = AppState.addEventListener("change", state => {
    foreground = state === "active";
    if (foreground) void refresh(true);
  });
  void refresh();
  return () => { disposed = true; queued = false; clearInterval(timer); unsubscribe(); app.remove(); };
}
