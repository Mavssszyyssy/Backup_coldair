import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { registerPushToken, unregisterPushToken } from "./api";
import { resolveNotificationRoute } from "./notificationRouteService";
import { notifyNotificationsChanged } from "./notificationEvents";

export const ANDROID_NOTIFICATION_CHANNEL_ID = "default";
const STORED_PUSH_TOKEN_KEY = "expo_push_token_v1";
let registeredDeviceToken = "";
let pendingRegistration = null;
let activeRecipientId = "";

export function setActivePushRecipient(userId) {
  activeRecipientId = String(userId || "");
}

async function rememberDeviceToken(value) {
  registeredDeviceToken = value;
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(STORED_PUSH_TOKEN_KEY, value);
    }
  } catch { /* Registration still works when device storage is unavailable. */ }
}

async function readDeviceToken() {
  if (registeredDeviceToken) return registeredDeviceToken;
  try {
    if (await SecureStore.isAvailableAsync()) {
      registeredDeviceToken = await SecureStore.getItemAsync(STORED_PUSH_TOKEN_KEY) || "";
    }
  } catch { /* A missing local token must not block sign-out. */ }
  return registeredDeviceToken;
}

async function forgetDeviceToken() {
  registeredDeviceToken = "";
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.deleteItemAsync(STORED_PUSH_TOKEN_KEY);
    }
  } catch { /* Server cleanup has already succeeded. */ }
}

function hasPushPermission(permissions) {
  return permissions?.granted === true || permissions?.status === "granted"
    || (Platform.OS === "ios" && permissions?.ios?.status === Notifications?.IosAuthorizationStatus?.PROVISIONAL);
}

// Expo Go no longer includes Android remote-notification support. Importing
// expo-notifications there throws while the root layout is loading, which also
// makes Expo Router report a misleading "missing default export" error. Keep
// the module lazy so Expo Go can run the rest of the app; development and
// release builds still load the complete notification implementation.
const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

let Notifications = null;
if (!isExpoGo && Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");
  } catch (error) {
    console.warn(
      "Push notifications are unavailable in this build.",
      error?.message || error,
    );
  }
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const recipientId = notification?.request?.content?.data?.recipientId;
      const allowed = Boolean(activeRecipientId && recipientId)
        && String(recipientId) === activeRecipientId;
      return {
        shouldShowAlert: allowed,
        shouldPlaySound: allowed,
        shouldSetBadge: allowed,
        shouldShowBanner: allowed,
        shouldShowList: allowed,
      };
    },
  });
}

function getResponseRoute(response, role, userId) {
  if (!response?.notification?.request) return null;
  const data = response.notification.request.content?.data || {};
  if (userId && String(data.recipientId || "") !== String(userId)) return null;
  const route = resolveNotificationRoute(
    {
      route: data.route,
      type: data.type,
      targetId: data.targetId,
      targetType: data.targetType,
      category: data.category,
      title: response?.notification?.request?.content?.title,
      message: response?.notification?.request?.content?.body,
    },
    role,
  );
  const rolePrefix = role === "technician" ? "/technician/" : role === "customer" ? "/customer/" : "";
  return rolePrefix && route?.startsWith(rolePrefix) ? route : null;
}

async function registerDeviceForPush(token, { requestPermission = true } = {}) {
  if (!token || Platform.OS === "web") return { success: false, skipped: true };
  if (!Notifications) {
    return { success: false, skipped: true, reason: isExpoGo ? "expo-go" : "unavailable" };
  }

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

    let permissions = await Notifications.getPermissionsAsync();
    if (!hasPushPermission(permissions) && requestPermission && permissions?.canAskAgain !== false) {
      permissions = await Notifications.requestPermissionsAsync();
    }
    if (!hasPushPermission(permissions)) {
      return { success: false, error: "Permission to receive alerts was not granted." };
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) return { success: false, error: "Push alerts are not configured." };

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!/^(ExponentPushToken|ExpoPushToken)\[[^\]\s]{1,200}\]$/.test(String(expoPushToken || ""))) {
      return { success: false, error: "A push token is unavailable on this device." };
    }
    const result = await registerPushToken(token, expoPushToken);
    if (result.success) await rememberDeviceToken(expoPushToken);
    return result;
  } catch (error) {
    return { success: false, error: error?.message || "Unable to register this device." };
  }
}

export async function enablePushNotifications(token, options) {
  if (pendingRegistration?.token === token) return pendingRegistration.promise;
  const attempt = registerDeviceForPush(token, options);
  pendingRegistration = { token, promise: attempt };
  try { return await attempt; }
  finally { if (pendingRegistration?.promise === attempt) pendingRegistration = null; }
}

export async function disablePushNotifications(token) {
  if (!token || Platform.OS === "web" || !Notifications) return { success: false, skipped: true };
  if (pendingRegistration?.token === token) await pendingRegistration.promise.catch(() => {});
  const deviceToken = await readDeviceToken();
  if (!deviceToken) return { success: false, skipped: true };
  try {
    const result = await unregisterPushToken(token, deviceToken);
    if (result.success) await forgetDeviceToken();
    return result;
  } catch (error) {
    return { success: false, error: error?.message || "Unable to disable push alerts for this device." };
  }
}

export function createPushNavigationGuard() {
  const recent = new Map();
  return (response) => {
    const request = response?.notification?.request;
    const id = String(request?.content?.data?.notificationId || request?.identifier || "");
    const now = Date.now();
    for (const [key, openedAt] of recent) {
      if (now - openedAt >= 30000) recent.delete(key);
    }
    if (id && recent.has(id)) return false;
    if (id) recent.set(id, now);
    return true;
  };
}

export function listenForNotificationNavigation(router, role, { userId, shouldOpen } = {}) {
  if (!Notifications) return () => {};

  const received = Notifications.addNotificationReceivedListener(() => notifyNotificationsChanged());
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    notifyNotificationsChanged();
    const route = getResponseRoute(response, role, userId);
    if (route && (!shouldOpen || shouldOpen(response))) router.push(route);
  });

  return () => { subscription.remove(); received.remove(); };
}

export async function openInitialNotification(router, role, { userId, shouldOpen } = {}) {
  if (!Notifications) return null;

  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  const route = getResponseRoute(response, role, userId);
  await Notifications.clearLastNotificationResponseAsync();
  if (route && (!shouldOpen || shouldOpen(response))) router.push(route);
  return route;
}
