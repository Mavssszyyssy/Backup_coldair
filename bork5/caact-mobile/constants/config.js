// constants/config.js
// Central place for environment-level configuration.
//
// Override when needed:
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.33:5000/api
//   EXPO_PUBLIC_API_BASE=http://192.168.1.33:5000/api
//
// By default, Expo LAN runs derive the backend host from Metro's host and use
// the Express backend in ../../backend on port 5000.

import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = "5000";

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

const getDefaultApiOrigin = () => {
  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:${BACKEND_PORT}`;

  const browserHost = getBrowserHost();
  if (browserHost) return `http://${browserHost}:${BACKEND_PORT}`;

  if (Platform.OS === "android") return `http://10.0.2.2:${BACKEND_PORT}`;
  return `http://localhost:${BACKEND_PORT}`;
};

const normalizeApiBase = (value = "") => {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) return `${getDefaultApiOrigin()}/api`;
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

export const API_BASE = normalizeApiBase(getConfiguredBaseUrl());
export const API_HEALTH_URL = `${API_BASE}/health`;
