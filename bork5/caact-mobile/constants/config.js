// constants/config.js
// Central place for environment-level configuration.
//
// Override when needed:
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.33:5000/api
//   EXPO_PUBLIC_API_BASE=http://192.168.1.33:5000/api
//
// By default, Expo LAN runs derive the backend host from Metro's host and use
// the Express fallback listener on port 5001. Requests retry port 5000 when
// that primary backend listener is available instead.

import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = "5001";
const BACKEND_FALLBACK_PORT = "5000";

const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const getConfiguredBaseUrl = () =>
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "";

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest?.hostUri ||
    "";

  return String(hostUri).split(":")[0];
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
  const trimmed = trimTrailingSlash(value);
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
