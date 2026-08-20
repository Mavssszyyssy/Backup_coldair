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

const publish = (next) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
};

export const subscribeBackendConnection = (listener) => {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
};

export const beginBackendConnection = (path = "") => {
  publish({
    activeRequests: snapshot.activeRequests + 1,
    message: "Connecting to the server...",
    path,
    state: "connecting",
  });
};

export const finishBackendConnection = (path = "") => {
  const activeRequests = Math.max(0, snapshot.activeRequests - 1);
  publish({
    activeRequests,
    message: activeRequests ? "Loading..." : "Loaded",
    path: path || snapshot.path,
    state: activeRequests ? "connecting" : "loaded",
  });
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
