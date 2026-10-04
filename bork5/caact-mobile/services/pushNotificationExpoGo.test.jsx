import { registerPushToken } from "./api";
import {
  enablePushNotifications,
  listenForNotificationNavigation,
  openInitialNotification,
} from "./pushNotificationService";

jest.mock("expo-constants", () => ({
  executionEnvironment: "storeClient",
  appOwnership: "expo",
  expoConfig: { extra: { eas: { projectId: "fixture-project" } } },
}));

jest.mock("expo-notifications", () => {
  throw new Error("expo-notifications is unavailable in Expo Go");
});

jest.mock("./api", () => ({ registerPushToken: jest.fn() }));

test("keeps Expo Go usable when Android remote notifications are unavailable", async () => {
  const router = { push: jest.fn() };

  await expect(enablePushNotifications("session-token")).resolves.toEqual({
    success: false,
    skipped: true,
    reason: "expo-go",
  });
  await expect(openInitialNotification(router, "customer")).resolves.toBeNull();

  const stopListening = listenForNotificationNavigation(router, "customer");
  expect(() => stopListening()).not.toThrow();
  expect(router.push).not.toHaveBeenCalled();
  expect(registerPushToken).not.toHaveBeenCalled();
});
