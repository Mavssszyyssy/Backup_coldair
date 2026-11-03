import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushToken, unregisterPushToken } from "./api";
import {
  ANDROID_NOTIFICATION_CHANNEL_ID,
  disablePushNotifications,
  enablePushNotifications,
  setActivePushRecipient,
} from "./pushNotificationService";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
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

jest.mock("./api", () => ({ registerPushToken: jest.fn(), unregisterPushToken: jest.fn() }));

const foregroundHandler = Notifications.setNotificationHandler.mock.calls[0][0].handleNotification;

beforeEach(() => {
  jest.clearAllMocks();
  Notifications.setNotificationChannelAsync.mockResolvedValue();
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "undetermined" });
  Notifications.requestPermissionsAsync.mockResolvedValue({ status: "granted" });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[fixture]" });
  registerPushToken.mockResolvedValue({ success: true });
  unregisterPushToken.mockResolvedValue({ success: true });
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
    expect.objectContaining({ name: "AEROPULSE alerts", importance: 4 }),
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

test("denied permission and missing device tokens do not register a recipient", async () => {
  setPlatform("ios");
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "denied", canAskAgain: false });
  await expect(enablePushNotifications("session-token")).resolves.toMatchObject({ success: false });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(registerPushToken).not.toHaveBeenCalled();

  Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "" });
  await expect(enablePushNotifications("session-token")).resolves.toMatchObject({ success: false });
  expect(registerPushToken).not.toHaveBeenCalled();
});

test("a foreground retry does not prompt again and token failures leave the app usable", async () => {
  setPlatform("android");
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "denied", canAskAgain: true });
  await expect(enablePushNotifications("session-token", { requestPermission: false })).resolves.toMatchObject({ success: false });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();

  Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
  Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error("Push service unavailable"));
  await expect(enablePushNotifications("session-token", { requestPermission: false })).resolves.toMatchObject({
    success: false, error: "Push service unavailable",
  });
  expect(registerPushToken).not.toHaveBeenCalled();
});

test("accepts provisional iOS authorization and removes the device token on sign-out", async () => {
  setPlatform("ios");
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "undetermined", ios: { status: 3 } });
  await expect(enablePushNotifications("ios-session")).resolves.toEqual({ success: true });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  await expect(disablePushNotifications("ios-session")).resolves.toEqual({ success: true });
  expect(unregisterPushToken).toHaveBeenCalledWith("ios-session", "ExponentPushToken[fixture]");
});

test("foreground display hides another account's queued push", async () => {
  setActivePushRecipient("customer-1");
  await expect(foregroundHandler({ request: { content: { data: { recipientId: "customer-2" } } } }))
    .resolves.toMatchObject({ shouldShowBanner: false, shouldPlaySound: false });
  await expect(foregroundHandler({ request: { content: { data: { recipientId: "customer-1" } } } }))
    .resolves.toMatchObject({ shouldShowBanner: true });
  await expect(foregroundHandler({ request: { content: { data: {} } } }))
    .resolves.toMatchObject({ shouldShowBanner: false });
  setActivePushRecipient(null);
});
