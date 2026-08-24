import AsyncStorage from "@react-native-async-storage/async-storage";

// Operational records always come from the backend. These keys are only
// short-lived, device-side read caches, so remove them whenever an account is
// changed or signed out. This prevents a second user on the same phone from
// seeing a previous user's orders, units, work, or cart while offline.
const EXACT_KEYS = new Set([
  "coldair_cart",
  "orders_storage_v1",
  "technician_tasks_storage_v2",
  "service_requests_storage_v2",
  "units_storage_v1",
  "unit_service_logs_storage_v1",
  "local_notifications_v1",
  "auth_users",
  "auth_current_user",
  "auth_audit_logs",
]);

const KEY_PREFIXES = [
  "coldair_cart_v2:",
  "unit_service_log_draft_v1_",
];

export async function clearOperationalSessionCache() {
  const keys = await AsyncStorage.getAllKeys();
  const removable = keys.filter(
    (key) => EXACT_KEYS.has(key) || KEY_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );

  if (removable.length) {
    await AsyncStorage.multiRemove(removable);
  }
}
