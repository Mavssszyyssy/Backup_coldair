// Shared connection state for every request made by the mobile application.
// Keeping this outside a screen lets the status remain accurate while users
// move between customer, technician, and staff areas.

const CONNECTION_FAILED_MESSAGE =
  "Unable to connect to the server. Please check your connection and try again.";

let snapshot = {
  activeRequests: 0,
  message: "",
  path: "",
  state: "loaded",
};

const listeners = new Set();
const recoveryListeners = new Set();

const publish = (next) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
};

export const subscribeBackendConnection = (listener) => {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
};

// Read-only screens subscribe to this event through liveRefresh. It is only
// published after a real API response proves that the backend is reachable
// again. Mutating actions are never replayed automatically because their
// result may be uncertain after a dropped connection.
export const subscribeBackendRecovery = (listener) => {
  recoveryListeners.add(listener);
  return () => recoveryListeners.delete(listener);
};

const publishRecovery = () => {
  recoveryListeners.forEach((listener) => listener());
};

export const beginBackendConnection = (path = "") => {
  const failed = snapshot.state === "failed";
  publish({
    activeRequests: snapshot.activeRequests + 1,
    message: failed ? snapshot.message : "Connecting to the server...",
    path,
    // Keep the actionable offline warning visible while background refreshes
    // are also attempting to reconnect.
    state: failed ? "failed" : "connecting",
  });
};

export const finishBackendConnection = (path = "") => {
  const recovered = snapshot.state === "failed";
  const activeRequests = Math.max(0, snapshot.activeRequests - 1);
  publish({
    activeRequests,
    message: activeRequests ? "Loading..." : "Loaded",
    path: path || snapshot.path,
    state: activeRequests ? "connecting" : "loaded",
  });
  if (recovered) publishRecovery();
};

export const failBackendConnection = (path = "") => {
  publish({
    activeRequests: Math.max(0, snapshot.activeRequests - 1),
    message: CONNECTION_FAILED_MESSAGE,
    path: path || snapshot.path,
    state: "failed",
  });
};

export { CONNECTION_FAILED_MESSAGE };
