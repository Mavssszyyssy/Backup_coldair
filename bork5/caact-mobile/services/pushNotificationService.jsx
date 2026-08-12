import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { registerPushToken } from "./api";
import { resolveNotificationRoute } from "./notificationService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getResponseRoute(response, role) {
  const data = response?.notification?.request?.content?.data || {};
  return resolveNotificationRoute(
    {
      route: data.route,
      type: data.type,
      title: response?.notification?.request?.content?.title,
      message: response?.notification?.request?.content?.body,
    },
    role,
  );
}

export async function enablePushNotifications(token) {
  if (!token || Platform.OS === "web") return { success: false, skipped: true };

  const currentPermissions = await Notifications.getPermissionsAsync();
  let status = currentPermissions.status;
  if (status !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    status = requestedPermissions.status;
  }
  if (status !== "granted") {
    return { success: false, error: "Notification permission was not granted." };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return { success: false, error: "Push notification project is not configured." };

  try {
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return await registerPushToken(token, expoPushToken);
  } catch (error) {
    return { success: false, error: error?.message || "Unable to register this device." };
  }
}

export function listenForNotificationNavigation(router, role) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const route = getResponseRoute(response, role);
    if (route) router.push(route);
  });

  return () => subscription.remove();
}

export async function openInitialNotification(router, role) {
  const response = await Notifications.getLastNotificationResponseAsync();
  const route = getResponseRoute(response, role);
  if (route) router.push(route);
}
