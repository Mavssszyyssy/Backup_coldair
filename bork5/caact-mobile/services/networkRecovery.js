import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

import { reportBackendUnavailable } from "./backendConnectionState";

export const DEVICE_OFFLINE_PATH = "__device_network__";
export const DEVICE_OFFLINE_MESSAGE =
  "No internet connection. Reconnect to Wi-Fi, hotspot, or mobile data, then try again.";

const isOffline = (state = {}) =>
  state.isConnected === false || state.isInternetReachable === false;

const networkType = (state = {}) => String(state.type || "unknown");

// Watches the phone's actual connection instead of waiting for a request to
// time out. A confirmed reconnection is followed by a database-backed probe;
// checkBackendConnection publishes recovery only after that probe succeeds.
export function startNetworkRecovery(probeBackend) {
  let disposed = false;
  let previous = null;
  let probeRunning = false;
  let probeQueued = false;

  const probe = async () => {
    if (disposed) return;
    if (probeRunning) {
      probeQueued = true;
      return;
    }
    probeRunning = true;
    try {
      await probeBackend();
    } catch {
      // The shared request layer owns the visible connection failure state.
    } finally {
      probeRunning = false;
      if (probeQueued && !disposed) {
        probeQueued = false;
        void probe();
      }
    }
  };

  const handleNetworkState = (next = {}, { forceProbe = false } = {}) => {
    if (disposed) return;
    const offline = isOffline(next);
    const priorOffline = previous ? isOffline(previous) : false;
    const changedType = previous && networkType(previous) !== networkType(next);
    previous = next;

    if (offline) {
      reportBackendUnavailable(DEVICE_OFFLINE_PATH, DEVICE_OFFLINE_MESSAGE);
      return;
    }

    if (forceProbe || priorOffline || changedType) void probe();
  };

  const unsubscribe = NetInfo.addEventListener((state) => {
    handleNetworkState(state);
  });
  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    Promise.resolve(NetInfo.refresh?.())
      .then(() => NetInfo.fetch())
      .then((network) => handleNetworkState(network, { forceProbe: true }))
      .catch(() => void probe());
  });

  return () => {
    disposed = true;
    probeQueued = false;
    unsubscribe();
    appStateSubscription.remove();
  };
}
