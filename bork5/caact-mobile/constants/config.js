// constants/config.js
// Central place for environment-level configuration.
//
// Override when needed:
//   EXPO_PUBLIC_API_BASE_URL=https://aeropulse-backend.vercel.app/api
//   EXPO_PUBLIC_API_BASE=https://aeropulse-backend.vercel.app/api
//
// By default, Expo LAN runs derive the backend host from Metro's host and use
// the Express listener on port 5000. This is the port used by the local
// backend, so a physical device never tries to reach its own localhost.

import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = "5000";
const BACKEND_FALLBACK_PORT = "5001";
const RETIRED_BACKEND_HOST = "https://backend-deployment-ivory.vercel.app";
const LIVE_BACKEND_HOST = "https://aeropulse-backend.vercel.app";

const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");
const replaceRetiredBackend = (value = "") =>
  String(value).replace(RETIRED_BACKEND_HOST, LIVE_BACKEND_HOST);

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

export async function apiFetch(path, options) {
  let networkError;
  for (const baseUrl of [API_BASE, ...API_BASE_FALLBACKS]) {
    try {
      return await fetch(`${baseUrl}${path}`, options);
    } catch (error) {
      networkError = error;
    }
  }
  throw networkError || new Error("Unable to reach the local API.");
}
