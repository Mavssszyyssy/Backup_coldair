import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken } from "./api";
import {
  ANDROID_NOTIFICATION_CHANNEL_ID,
  enablePushNotifications,
} from "./pushNotificationService";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "fixture-project" } } },
  easConfig: null,
}));

jest.mock("./api", () => ({ registerPushToken: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  Notifications.setNotificationChannelAsync.mockResolvedValue();
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "undetermined" });
  Notifications.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[fixture]" });
  registerPushToken.mockResolvedValue({ success: true });
});

let platformDescriptor;

beforeAll(() => {
  platformDescriptor = Object.getOwnPropertyDescriptor(Platform, "OS");
});

function setPlatform(os) {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: os,
  });
}

afterAll(() => {
  Object.defineProperty(Platform, "OS", platformDescriptor);
});

test("creates the Android channel before requesting notification permission", async () => {
  setPlatform("android");
  await expect(enablePushNotifications("session-token")).resolves.toEqual({
    success: true,
  });

  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
    ANDROID_NOTIFICATION_CHANNEL_ID,
    expect.objectContaining({ name: "AEROPULSE notifications", importance: 4 }),
  );
  expect(
    Notifications.setNotificationChannelAsync.mock.invocationCallOrder[0],
  ).toBeLessThan(Notifications.getPermissionsAsync.mock.invocationCallOrder[0]);
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
    projectId: "fixture-project",
  });
  expect(registerPushToken).toHaveBeenCalledWith(
    "session-token",
    "ExponentPushToken[fixture]",
  );
});

test("registers iOS push notifications without Android channel setup", async () => {
  setPlatform("ios");
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });

  await expect(enablePushNotifications("ios-session")).resolves.toEqual({
    success: true,
  });

  expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(registerPushToken).toHaveBeenCalledWith(
    "ios-session",
    "ExponentPushToken[fixture]",
  );
});
