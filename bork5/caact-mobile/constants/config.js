// constants/config.js
// Central place for environment-level configuration.
//
// Override when needed:
//   EXPO_PUBLIC_API_BASE_URL=https://api.coldair-act.online/api
//   EXPO_PUBLIC_API_BASE=https://api.coldair-act.online/api
//
// By default, Expo LAN runs derive the backend host from Metro's host and use
// the Express listener on port 5000. This is the port used by the local
// backend, so a physical device never tries to reach its own localhost.

import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  beginBackendConnection,
  failBackendConnection,
  finishBackendConnection,
} from "../services/backendConnectionState";

const BACKEND_PORT = "5000";
const BACKEND_FALLBACK_PORT = "5001";
const RETIRED_BACKEND_HOST = "https://backend-deployment-ivory.vercel.app";
const LIVE_BACKEND_HOST = "https://api.coldair-act.online";
const LEGACY_BACKEND_HOST = "https://aeropulse-backend.vercel.app";

const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");
const replaceRetiredBackend = (value = "") =>
  String(value)
    .replace(RETIRED_BACKEND_HOST, LIVE_BACKEND_HOST)
    .replace(LEGACY_BACKEND_HOST, LIVE_BACKEND_HOST);

const getConfiguredBaseUrl = () =>
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "";

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // Expo Go puts the Metro address here on physical devices. The app was
    // previously missing this value and could therefore fall back to
    // `localhost`, which refers to the phone instead of this computer.
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest?.hostUri ||
    "";

  const value = String(hostUri).trim();
  if (!value) return "";

  // Metro supplies `host:port`; tolerate a fully qualified URI as well.
  return value
    .replace(/^[a-z][a-z\d+.-]*:\/\//i, "")
    .split("/")[0]
    .split(":")[0];
};

const getBrowserHost = () => {
  if (typeof globalThis?.location?.hostname === "string") {
    return globalThis.location.hostname;
  }
  return "";
};

const getDefaultApiOrigin = (port = BACKEND_PORT) => {
  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:${port}`;

  const browserHost = getBrowserHost();
  if (browserHost) return `http://${browserHost}:${port}`;

  if (Platform.OS === "android") return `http://10.0.2.2:${port}`;
  return `http://localhost:${port}`;
};

const normalizeApiBase = (value = "") => {
  const trimmed = trimTrailingSlash(replaceRetiredBackend(value));
  if (!trimmed) return `${getDefaultApiOrigin()}/api`;
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const configuredBaseUrl = getConfiguredBaseUrl();

export const API_BASE = normalizeApiBase(configuredBaseUrl);
export const API_BASE_FALLBACKS = configuredBaseUrl
  ? []
  : [normalizeApiBase(`${getDefaultApiOrigin(BACKEND_FALLBACK_PORT)}/api`)];
export const API_HEALTH_URL = `${API_BASE}/health`;

// React Native can leave a fetch pending when Android resumes an old socket
// after the app has been open or backgrounded for a long time. Bound every
// request that does not already supply its own AbortSignal so one stale socket
// cannot permanently block live refresh for the current screen.
export const DIRECT_FETCH_TIMEOUT_MS = 12000;
export const READ_RETRY_DELAY_MS = 300;
const TRANSIENT_BACKEND_STATUSES = new Set([502, 503, 504]);

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = DIRECT_FETCH_TIMEOUT_MS,
) => {
  const ownsController =
    !options.signal && typeof AbortController !== "undefined";
  const controller = ownsController ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    return await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (ownsController && controller?.signal?.aborted) {
      const timeoutError = new Error(
        "The backend request timed out. Please try again.",
      );
      timeoutError.name = "TimeoutError";
      timeoutError.code = "BACKEND_FETCH_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export async function apiFetch(path, options = {}) {
  beginBackendConnection(path);
  let networkError;
  // timeoutMs is an AEROPULSE client option, not part of the Fetch API. Keep
  // it out of the native request while applying it independently to every
  // recovery attempt. This is important on Android: reusing one already-
  // aborted signal made the second attempt fail immediately.
  const { timeoutMs = DIRECT_FETCH_TIMEOUT_MS, ...fetchOptions } = options;
  const method = String(fetchOptions.method || "GET").toUpperCase();
  const isSafeRead = method === "GET" || method === "HEAD";
  // AI and payment-provider requests must never be replayed after an uncertain
  // result. Only ordinary read requests get bounded automatic recovery.
  const excludesAutomaticRetry =
    path.startsWith("/ai/") || path.includes("/paymongo/");
  const maxAttempts = isSafeRead && !excludesAutomaticRetry ? 3 : 1;
  const requestBases = path.startsWith("/ai/")
    ? [API_BASE]
    : [API_BASE, ...API_BASE_FALLBACKS];

  for (const baseUrl of requestBases) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetchWithTimeout(
          `${baseUrl}${path}`,
          fetchOptions,
          timeoutMs,
        );
        if (
          TRANSIENT_BACKEND_STATUSES.has(response.status) &&
          attempt + 1 < maxAttempts
        ) {
          await wait(READ_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        if (TRANSIENT_BACKEND_STATUSES.has(response.status)) {
          failBackendConnection(path);
        } else {
          finishBackendConnection(path);
        }
        return response;
      } catch (error) {
        networkError = error;
        const callerCancelled = error?.name === "AbortError";
        if (!callerCancelled && attempt + 1 < maxAttempts) {
          await wait(READ_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }
  failBackendConnection(path);
  throw networkError || new Error("Unable to connect to the server.");
}
