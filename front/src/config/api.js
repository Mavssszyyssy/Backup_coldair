import { clearAuthSession, getAuthSessionItem, getSessionActiveBranch } from "../utils/authSession";

const LIVE_API_BASE_URL = "https://api.coldair-act.online/api";
const RETIRED_BACKEND_HOST = "https://backend-deployment-ivory.vercel.app";
const LEGACY_BACKEND_HOST = "https://aeropulse-backend.vercel.app";

// Keep old browser/Vercel environment settings from sending users to the
// retired backend deployment, which no longer contains the application API.
const replaceRetiredBackend = (value = "") =>
  String(value)
    .replace(RETIRED_BACKEND_HOST, "https://api.coldair-act.online")
    .replace(LEGACY_BACKEND_HOST, "https://api.coldair-act.online");

const API_BASE_URL = replaceRetiredBackend(
  process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    LIVE_API_BASE_URL,
);

const API_FALLBACK_URL = replaceRetiredBackend(
  process.env.REACT_APP_API_FALLBACK_URL || "",
);

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  API_BASE_URL.includes("localhost")
) {
  console.warn(
    "Frontend is running in production but API_BASE_URL is still pointing to localhost. " +
    "Set REACT_APP_API_URL in Vercel to your deployed backend URL.",
  );
}

const getToken = () => getAuthSessionItem("accessToken");
const getActiveBranch = () => getSessionActiveBranch();

let activeRequestCount = 0;
const inFlightReadRequests = new Map();

const publishConnectionState = (state, detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("aeropulse:connection", {
      detail: { state, activeRequests: activeRequestCount, ...detail },
    }),
  );
};

const beginConnection = (path) => {
  activeRequestCount += 1;
  publishConnectionState("connecting", { path });
};

const finishConnection = (state = "loaded", detail = {}) => {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  publishConnectionState(state, detail);
};

const waitBeforeRetry = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const isTransientResponse = (response) =>
  [502, 503, 504].includes(Number(response?.status));

const boundedTimeout = (value, fallback) => {
  const parsed = Number(value);
  const resolved = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(resolved, 3000), 60000);
};

const requestWithTimeout = async (url, options, timeoutMs, callerSignal) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortForCaller = () => controller.abort();
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  callerSignal?.addEventListener?.("abort", abortForCaller, { once: true });

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error("The server took too long to respond. Please retry.");
      timeoutError.code = "API_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    callerSignal?.removeEventListener?.("abort", abortForCaller);
  }
};

const performApiRequest = async (path, options = {}) => {
  const token = getToken();
  const activeBranch = getActiveBranch();
  const {
    timeoutMs: requestedTimeoutMs,
    signal: callerSignal,
    silentConnection = false,
    ...requestOptions
  } = options;
  if (!silentConnection) beginConnection(path);
  const method = String(requestOptions.method || "GET").toUpperCase();
  const timeoutMs = boundedTimeout(
    requestedTimeoutMs,
    method === "GET" ? 20000 : 30000,
  );
  const shouldDisableCache = method === "GET";
  const apiBaseUrls = [API_BASE_URL, API_FALLBACK_URL].filter(
    (value, index, values) => value && values.indexOf(value) === index,
  );
  const url = `${API_BASE_URL}${path}`;

  if (!token && !path.startsWith("/auth/") && path !== "/health") {
    console.warn("Attempting API request without auth token", { url, path });
  }

  let response;
  let requestUrl = url;
  let lastNetworkError;
  try {
    for (const baseUrl of apiBaseUrls) {
      requestUrl = `${baseUrl}${path}`;
      // A Vercel function can briefly be unavailable while waking or being
      // replaced. Retry a read-only request once before declaring the app
      // offline; never repeat a write that could duplicate a transaction.
      const attempts = shouldDisableCache ? 2 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          response = await requestWithTimeout(requestUrl, {
            ...requestOptions,
            ...(shouldDisableCache ? { cache: "no-store" } : {}),
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(activeBranch ? { "X-Branch": activeBranch } : {}),
              ...(requestOptions.headers || {}),
            },
          }, timeoutMs, callerSignal);
          if (!isTransientResponse(response) || attempt === attempts - 1) break;
          await waitBeforeRetry(350);
        } catch (error) {
          lastNetworkError = error;
          // A timed-out request is still running in the serverless function.
          // Starting an immediate second copy can multiply the database and
          // payment-provider work and is the main cause of long-lived tabs
          // becoming progressively slower. Only retry errors that indicate a
          // connection failed before the server started processing the read.
          if (attempt < attempts - 1 && error?.code !== "API_TIMEOUT") {
            await waitBeforeRetry(350);
            continue;
          }
        }
      }
      if (response) break;
    }
    if (!response) throw lastNetworkError || new Error("Network request failed.");
  } catch (error) {
    console.error("API request failed", { url: requestUrl, options, error });
    const message = error?.code === "API_TIMEOUT"
      ? error.message
      : "Unable to connect to the server. Please check your connection and try again.";
    const err = new Error(message);
    err.status = 0;
    err.code = error?.code || "API_NETWORK_ERROR";
    err.data = null;
    if (!silentConnection) finishConnection("failed", { path, message, url: requestUrl });
    throw err;
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      console.warn("Cleared stale auth state after 401.", { url: requestUrl, options });

      try {
        window.dispatchEvent(
          new CustomEvent("auth:logout", { detail: { reason: "401", url: requestUrl } }),
        );
      } catch (_error) {
        // ignore
      }
    }

    const message =
      data?.message ||
      (data?.errors && typeof data.errors === "object"
        ? Object.values(data.errors).join(" ")
        : "Request failed");
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    err.fieldErrors =
      data?.errors && typeof data.errors === "object" ? data.errors : null;
    if (!silentConnection) finishConnection("loaded", { path });
    throw err;
  }

  if (!silentConnection) finishConnection("loaded", { path });
  return data;
};

const apiRequest = (path, options = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  // Multiple panels can request the same data on the same refresh tick. Share
  // that read instead of allowing long-running tabs to build an ever-growing
  // queue of identical browser and serverless requests.
  if (method !== "GET" || options.signal) return performApiRequest(path, options);

  const requestKey = [
    path,
    getToken(),
    getActiveBranch(),
    JSON.stringify(options.headers || {}),
  ].join("|");
  const existingRequest = inFlightReadRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = performApiRequest(path, options);
  inFlightReadRequests.set(requestKey, request);
  request.then(
    () => {
      if (inFlightReadRequests.get(requestKey) === request) {
        inFlightReadRequests.delete(requestKey);
      }
    },
    () => {
      if (inFlightReadRequests.get(requestKey) === request) {
        inFlightReadRequests.delete(requestKey);
      }
    },
  );
  return request;
};

export { API_BASE_URL, apiRequest };
