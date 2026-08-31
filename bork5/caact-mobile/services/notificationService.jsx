// services/notificationService.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchNotifications,
  getStoredToken,
  markAllNotificationsRead,
  markNotificationRead as markRemoteNotificationRead,
} from "./api";

const STORAGE_KEY = "local_notifications_v1";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeNotification(item = {}) {
  const hasUnread = typeof item.unread === "boolean";
  const read =
    item.read === true || item.status === "read" || (hasUnread && !item.unread);
  const unread = hasUnread ? item.unread : !read;
  return {
    id: item.id || item._id || `notification_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    userId: item.userId || item.user || null,
    role: item.role || "",
    title: item.title || "Notification",
    message: item.message || "",
    type: item.type || "info",
    category: item.category || "",
    severity: item.severity || "info",
    route: resolveNotificationRoute(item),
    targetId: item.targetId || "",
    targetType: item.targetType || "",
    read,
    unread: Boolean(unread),
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export function resolveNotificationRoute(item = {}, role = "") {
  const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();
  const normalizedRole = String(role || item.role || "").toLowerCase();

  if (item.type === "warranty" || item.targetType === "warranty" || text.includes("warranty")) {
    return item.targetId ? `/customer/units/${encodeURIComponent(item.targetId)}?page=warranty` : "/customer/units";
  }
  if (item.targetType === "unit" || ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(item.category)) {
    return item.targetId ? `/customer/units/${encodeURIComponent(item.targetId)}?page=amp` : "/customer/units";
  }
  if (typeof item.route === "string" && item.route.startsWith("/")) {
    return item.route;
  }

  if (normalizedRole === "technician") {
    if (text.includes("part")) return "/technician/tasks";
    if (item.type === "order" || text.includes("order") || text.includes("task") || text.includes("work order")) {
      return "/technician/tasks";
    }
    return "/technician/dashboard";
  }

  if (text.includes("service") || text.includes("appointment") || text.includes("request")) {
    return "/customer/home";
  }
  if (item.type === "order" || text.includes("order")) return "/customer/orders";
  if (item.type === "account") return "/customer/settings";
  return "/customer/home";
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
  const token = await getStoredToken();
  if (token) {
    try {
      const result = await fetchNotifications(token);
      if (result.success) {
        return result.notifications.map((item) => {
          const normalized = normalizeNotification(item);
          return {
            ...normalized,
            route: resolveNotificationRoute(item, user?.role),
          };
        });
      }
    } catch {
      // Fall back to local notifications when offline.
    }
  }

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
  const token = await getStoredToken();
  if (token && notificationId) {
    try {
      await markRemoteNotificationRead(token, notificationId);
    } catch {
      // Local read-state will still be updated for offline friendliness.
    }
  }

  const items = await getAllNotifications();
  const next = items.map((item) =>
    String(item.id) === String(notificationId)
      ? normalizeNotification({ ...item, read: true, unread: false, status: "read" })
      : item
  );
  await saveAllNotifications(next);
  return next.find((item) => String(item.id) === String(notificationId)) || null;
}

export async function markNotificationsReadForUser(user = {}) {
  const token = await getStoredToken();
  if (token) {
    try {
      await markAllNotificationsRead(token);
    } catch {
      // Continue with local read-state.
    }
  }

  const items = await getAllNotifications();
  const next = items.map((item) => {
    const belongsToUser =
      (item.userId && String(item.userId) === String(user.id)) ||
      (item.role && String(item.role) === String(user.role)) ||
      (!item.userId && !item.role);
    return belongsToUser
      ? normalizeNotification({ ...item, read: true, unread: false, status: "read" })
      : item;
  });
  await saveAllNotifications(next);
  return next;
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
