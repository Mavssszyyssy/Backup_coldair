const NOTIFICATION_SYNC_EVENT = "aeropulse:notifications-updated";
const NOTIFICATION_SYNC_KEY = "aeropulse_notifications_updated_at";

export const announceNotificationUpdate = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFICATION_SYNC_KEY, String(Date.now()));
  } catch (_error) {
    // Same-tab updates still work when storage is unavailable.
  }
  window.dispatchEvent(new Event(NOTIFICATION_SYNC_EVENT));
};

export const subscribeToNotificationUpdates = (listener) => {
  if (typeof window === "undefined" || typeof listener !== "function") return () => {};
  const onStorage = (event) => {
    if (event.key === NOTIFICATION_SYNC_KEY) listener();
  };
  window.addEventListener(NOTIFICATION_SYNC_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(NOTIFICATION_SYNC_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
};

export { NOTIFICATION_SYNC_EVENT, NOTIFICATION_SYNC_KEY };
