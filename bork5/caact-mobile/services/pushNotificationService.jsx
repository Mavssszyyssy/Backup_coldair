import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { registerPushToken } from "./api";
import { resolveNotificationRoute } from "./notificationRouteService";
import { notifyNotificationsChanged } from "./notificationEvents";

export const ANDROID_NOTIFICATION_CHANNEL_ID = "default";

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
  if (!response?.notification?.request) return null;
  const data = response.notification.request.content?.data || {};
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

  try {
    // Android 13+ will not show its notification permission prompt until the
    // application has created at least one channel.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        ANDROID_NOTIFICATION_CHANNEL_ID,
        {
          name: "AEROPULSE alerts",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1594B8",
        },
      );
    }

    const currentPermissions = await Notifications.getPermissionsAsync();
    let status = currentPermissions.status;
    if (status !== "granted") {
      const requestedPermissions = await Notifications.requestPermissionsAsync();
      status = requestedPermissions.status;
    }
    if (status !== "granted") {
      return { success: false, error: "Permission to receive alerts was not granted." };
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) return { success: false, error: "Push alerts are not configured." };

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return await registerPushToken(token, expoPushToken);
  } catch (error) {
    return { success: false, error: error?.message || "Unable to register this device." };
  }
}

export function listenForNotificationNavigation(router, role) {
  const received = Notifications.addNotificationReceivedListener(() => notifyNotificationsChanged());
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    notifyNotificationsChanged();
    const route = getResponseRoute(response, role);
    if (route) router.push(route);
  });

  return () => { subscription.remove(); received.remove(); };
}

export async function openInitialNotification(router, role) {
  const response = await Notifications.getLastNotificationResponseAsync();
  const route = getResponseRoute(response, role);
  if (route) {
    await Notifications.clearLastNotificationResponseAsync();
    router.push(route);
  }
}
