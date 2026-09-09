const listeners = new Set();
export const subscribeNotificationChanges = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const notifyNotificationsChanged = () => listeners.forEach(listener => listener());
