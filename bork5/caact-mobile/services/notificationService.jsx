// services/notificationService.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "local_notifications_v1";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeNotification(item = {}) {
  return {
    id: item.id || `notification_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    userId: item.userId || null,
    role: item.role || "",
    title: item.title || "Notification",
    message: item.message || "",
    type: item.type || "info",
    route: item.route || "",
    targetId: item.targetId || "",
    read: item.read === true,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export async function getAllNotifications() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.map(normalizeNotification) : [];
}

export async function saveAllNotifications(items = []) {
  const normalized = items.map(normalizeNotification);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function createNotification(payload = {}) {
  const items = await getAllNotifications();
  const created = normalizeNotification(payload);
  const next = [created, ...items].slice(0, 200);
  await saveAllNotifications(next);
  return created;
}

export async function getNotificationsForUser(user = {}) {
  const items = await getAllNotifications();
  return items
    .filter((item) => {
      if (item.userId && String(item.userId) === String(user.id)) return true;
      if (item.role && String(item.role) === String(user.role)) return true;
      return !item.userId && !item.role;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function markNotificationRead(notificationId) {
  const items = await getAllNotifications();
  const next = items.map((item) =>
    String(item.id) === String(notificationId)
      ? normalizeNotification({ ...item, read: true })
      : item
  );
  await saveAllNotifications(next);
  return next.find((item) => String(item.id) === String(notificationId)) || null;
}

export async function clearNotificationsForUser(user = {}) {
  const items = await getAllNotifications();
  const next = items.filter((item) => {
    if (item.userId && String(item.userId) === String(user.id)) return false;
    if (item.role && String(item.role) === String(user.role)) return false;
    return true;
  });
  await saveAllNotifications(next);
  return next;
}
