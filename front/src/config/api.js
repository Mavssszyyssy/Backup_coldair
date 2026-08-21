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

const apiRequest = async (path, options = {}) => {
  beginConnection(path);
  const token = getToken();
  const activeBranch = getActiveBranch();
  const method = String(options.method || "GET").toUpperCase();
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
      try {
        response = await fetch(requestUrl, {
          ...options,
          ...(shouldDisableCache ? { cache: "no-store" } : {}),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(activeBranch ? { "X-Branch": activeBranch } : {}),
            ...(options.headers || {}),
          },
        });
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }
    if (!response) throw lastNetworkError || new Error("Network request failed.");
  } catch (error) {
    console.error("API request failed", { url: requestUrl, options, error });
    const message =
      "Unable to connect to the server. Please check your connection and try again.";
    const err = new Error(message);
    err.status = 0;
    err.data = null;
    finishConnection("failed", { path, message, url: requestUrl });
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
    finishConnection("loaded", { path });
    throw err;
  }

  finishConnection("loaded", { path });
  return data;
};

export { API_BASE_URL, apiRequest };
