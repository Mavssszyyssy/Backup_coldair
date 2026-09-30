import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  AUTH_TOKEN_KEY,
  clearAuthToken,
  readAuthToken,
  writeAuthToken,
} from "./tokenStorage";

jest.mock("expo-secure-store", () => ({
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.isAvailableAsync.mockResolvedValue(true);
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue();
  SecureStore.deleteItemAsync.mockResolvedValue();
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue();
  AsyncStorage.removeItem.mockResolvedValue();
});

test("reads an Android session from encrypted storage", async () => {
  SecureStore.getItemAsync.mockResolvedValue("secure-session");

  await expect(readAuthToken()).resolves.toBe("secure-session");
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});

test("migrates an existing session without signing the user out", async () => {
  AsyncStorage.getItem.mockResolvedValue("legacy-session");

  await expect(readAuthToken()).resolves.toBe("legacy-session");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    AUTH_TOKEN_KEY,
    "legacy-session",
  );
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
});

test("stores new sessions securely and removes any legacy copy", async () => {
  await writeAuthToken("new-session");

  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    AUTH_TOKEN_KEY,
    "new-session",
  );
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
});

test("clears both secure and legacy session copies", async () => {
  await clearAuthToken();

  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
});
