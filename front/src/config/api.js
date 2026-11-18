import { clearAuthSession, getAuthSessionItem, getSessionActiveBranch } from "../utils/authSession";
import { createPageDataCache, readCacheTtl } from "./pageDataCache";

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
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.REACT_APP_API_URL ||
    LIVE_API_BASE_URL,
);

const API_FALLBACK_URL = replaceRetiredBackend(
  import.meta.env.VITE_API_FALLBACK_URL || "",
);

if (
  typeof window !== "undefined" &&
  import.meta.env.PROD &&
  API_BASE_URL.includes("localhost")
) {
  console.warn(
    "Frontend is running in production but API_BASE_URL is still pointing to localhost. " +
    "Set VITE_API_URL in Vercel to your deployed backend URL.",
  );
}

const getToken = () => getAuthSessionItem("accessToken");
const getActiveBranch = () => getSessionActiveBranch();
const isPublicApiPath = (path = "") => /^(?:\/health|\/products\/public|\/branches(?:\/resolve)?|\/system-settings\/email-domains\/public)(?:\?|$)/.test(path)
  || path.startsWith("/auth/");

let activeRequestCount = 0;
const inFlightReadRequests = new Map();
const pageData = createPageDataCache();
const writesInFlight = { data: 0, notifications: 0 };
const generations = { data: 0, notifications: 0 };
let cacheScope;

function invalidatePageData(group) {
  pageData.invalidate(group);
  for (const key of Object.keys(generations)) {
    if (!group || group === key) generations[key] += 1;
  }
  for (const [key, request] of inFlightReadRequests) {
    if (!group || group === request.group) inFlightReadRequests.delete(key);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:session-ended", () => invalidatePageData());
}

// These operations are independent of the records displayed by the portal.
const noPageDataWrite = /^\/(?:ai\/customer-chat|auth\/(?:session\/(?:cart|registration)|request-otp|verify-otp|forgot-password|login\/resend-email)|users\/validate)(?:\?|$)/;
const dataGroup = (path) => path.startsWith("/notifications") ? "notifications" : "data";

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
  const {
    timeoutMs: requestedTimeoutMs,
    signal: callerSignal,
    silentConnection = false,
    ...requestOptions
  } = options;
  if (!silentConnection) beginConnection(path);
  const method = String(requestOptions.method || "GET").toUpperCase();
  // The catalogue is public, and its stock scope is selected by the query string.
  const publicCatalogue = method === "GET" && path.split("?")[0] === "/products/public";
  const token = publicCatalogue ? null : getToken();
  const activeBranch = publicCatalogue ? "" : getActiveBranch();
  const timeoutMs = boundedTimeout(
    requestedTimeoutMs,
    method === "GET" ? 20000 : 30000,
  );
  const shouldDisableCache = method === "GET";
  const apiBaseUrls = [API_BASE_URL, API_FALLBACK_URL].filter(
    (value, index, values) => value && values.indexOf(value) === index,
  );
  const url = `${API_BASE_URL}${path}`;

  if (!token && !isPublicApiPath(path)) {
    console.warn("Attempting API request without auth token", { url, path });
  }

  let response;
  let requestUrl = url;
  let lastNetworkError;
  try {
    // An uncertain AI POST may already incur usage; do not resend to another host.
    const requestBases = path.startsWith("/ai/") ? apiBaseUrls.slice(0, 1) : apiBaseUrls;
    for (const baseUrl of requestBases) {
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
            credentials: publicCatalogue ? "omit" : "include",
            headers: {
              // A bodyless GET needs no JSON content type. Sending one forces
              // an avoidable CORS preflight for public catalog and health reads.
              ...(method !== "GET" || requestOptions.body != null
                ? { "Content-Type": "application/json" }
                : {}),
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
    console.error("API request failed", { method, error: error?.name || "Error" });
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
    if (response.status === 403 && token === getToken()) invalidatePageData();
    if (response.status === 401 && token === getToken()) {
      invalidatePageData();
      clearAuthSession();
      console.warn("Cleared stale auth state after 401.");

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

const apiRequest = (path, { fresh = false, display = false, onCached, ...options } = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  const token = getToken();
  const branch = getActiveBranch();
  const scope = JSON.stringify([token, branch]);
  if (scope !== cacheScope) {
    invalidatePageData();
    cacheScope = scope;
  }
  const group = dataGroup(path);
  if (method !== "GET") {
    if (noPageDataWrite.test(path)) return performApiRequest(path, options);
    const invalidate = group === "notifications" ? group : undefined;
    writesInFlight[group] += 1;
    invalidatePageData(invalidate);
    return performApiRequest(path, options).finally(() => {
      writesInFlight[group] -= 1;
      invalidatePageData(invalidate);
    });
  }
  if (options.signal || options.headers || options.body != null) return performApiRequest(path, options);

  const ttl = readCacheTtl(path, { token, display, ...options });
  const canReuse = ttl && !writesInFlight[group] && !writesInFlight.data;
  const separator = path.indexOf("?");
  const route = separator < 0 ? path : path.slice(0, separator);
  const query = separator < 0 ? "" : path.slice(separator + 1);
  const queryParams = new URLSearchParams(query);
  queryParams.sort();
  const queryKey = queryParams.toString();
  const key = JSON.stringify([queryKey ? `${route}?${queryKey}` : route, display]);
  const cached = canReuse && !fresh ? pageData.read(key, ttl, Boolean(onCached)) : null;
  if (cached) {
    onCached?.(cached.data, cached.loadedAt);
    if (cached.fresh) return Promise.resolve(cached.data);
  }

  // A live-only or explicitly refreshed read cannot join an older display read.
  const refreshKey = JSON.stringify([key, true]);
  const defaultKey = JSON.stringify([key, false]);
  const requestKey = fresh ? refreshKey : defaultKey;
  const existingRequest = inFlightReadRequests.get(refreshKey)
    || (!fresh && inFlightReadRequests.get(defaultKey));
  if (existingRequest) return existingRequest.promise;
  if (fresh) {
    pageData.remove(key);
    inFlightReadRequests.delete(defaultKey);
  }

  const generation = generations[group];
  const request = performApiRequest(path, cached ? { ...options, silentConnection: true } : options);
  const entry = { promise: request, group };
  inFlightReadRequests.set(requestKey, entry);
  const finish = () => {
    if (inFlightReadRequests.get(requestKey) === entry) inFlightReadRequests.delete(requestKey);
  };
  request.then(
    (data) => {
      if (canReuse && inFlightReadRequests.get(requestKey) === entry
        && generation === generations[group] && token === getToken() && branch === getActiveBranch()) {
        pageData.save(key, data, group);
      }
      finish();
    },
    finish,
  );
  return request;
};

export { API_BASE_URL, apiRequest };
