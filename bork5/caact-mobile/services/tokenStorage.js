import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const AUTH_TOKEN_KEY = "auth_token";

async function secureStoreIsAvailable() {
  if (Platform.OS === "web" || typeof SecureStore.isAvailableAsync !== "function") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function readAuthToken() {
  if (!(await secureStoreIsAvailable())) {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  try {
    const secureToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    if (secureToken) return secureToken;

    // One-time migration for users who signed in before SecureStore was used.
    const legacyToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!legacyToken) return null;

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return legacyToken;
  } catch {
    // Keep the session recoverable on devices where the native keystore is
    // temporarily unavailable instead of forcing an unexpected sign-out.
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }
}

export async function writeAuthToken(token) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    await clearAuthToken();
    return;
  }

  if (await secureStoreIsAvailable()) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, normalizedToken);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  await AsyncStorage.setItem(AUTH_TOKEN_KEY, normalizedToken);
}

export async function clearAuthToken() {
  const removals = [AsyncStorage.removeItem(AUTH_TOKEN_KEY)];
  if (await secureStoreIsAvailable()) {
    removals.push(SecureStore.deleteItemAsync(AUTH_TOKEN_KEY));
  }
  await Promise.allSettled(removals);
}
