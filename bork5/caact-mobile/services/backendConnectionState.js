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
const failedPaths = new Set();

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
  const recovered = failedPaths.delete(path);
  const activeRequests = Math.max(0, snapshot.activeRequests - 1);
  const stillFailed = failedPaths.size > 0;
  publish({
    activeRequests,
    message: stillFailed
      ? CONNECTION_FAILED_MESSAGE
      : activeRequests
        ? "Loading..."
        : "Loaded",
    path: path || snapshot.path,
    state: stillFailed ? "failed" : activeRequests ? "connecting" : "loaded",
  });
  // A successful notification request does not prove that a failed /tasks
  // request recovered. Notify screens only when the same failed route later
  // succeeds, preventing a refresh storm between healthy and failing routes.
  if (recovered && !stillFailed) publishRecovery();
};

export const failBackendConnection = (path = "") => {
  if (path) failedPaths.add(path);
  publish({
    activeRequests: Math.max(0, snapshot.activeRequests - 1),
    message: CONNECTION_FAILED_MESSAGE,
    path: path || snapshot.path,
    state: "failed",
  });
};

// Used only after a database-backed Retry probe succeeds. At that point it is
// safe to re-run focused screen loaders once and clear stale route failures.
export const confirmBackendRecovery = (path = "") => {
  const recovered = failedPaths.size > 0 || snapshot.state === "failed";
  failedPaths.clear();
  publish({
    activeRequests: Math.max(0, snapshot.activeRequests),
    message: snapshot.activeRequests ? "Loading..." : "Loaded",
    path: path || snapshot.path,
    state: snapshot.activeRequests ? "connecting" : "loaded",
  });
  if (recovered) publishRecovery();
};

export { CONNECTION_FAILED_MESSAGE };
