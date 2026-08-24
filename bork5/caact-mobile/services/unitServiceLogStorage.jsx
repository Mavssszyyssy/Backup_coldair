import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "./api";

const STORAGE_KEY = "unit_service_logs_storage_v1";
const DRAFT_KEY = "unit_service_log_draft_v1";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export const LOG_TYPES = [
  { id: "installation", label: "Installation" },
  { id: "cleaning", label: "Cleaning" },
  { id: "repair", label: "Repair" },
  { id: "checkup", label: "Check-up" },
  { id: "other", label: "Other" },
];

export function normalizeServiceLog(log = {}) {
  const createdAt = log.createdAt || new Date().toISOString();
  return {
    id: log.id || `unit_log_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    taskId: log.taskId || "",
    requestId: log.requestId || "",
    unitId: log.unitId || "",
    unitName: log.unitName || "",
    technicianId: log.technicianId || "",
    technicianName: log.technicianName || "",
    logType: log.logType || "other",
    label: log.label || LOG_TYPES.find((type) => type.id === log.logType)?.label || "Other",
    condition: log.condition || "Good",
    hoursSpent: Number(log.hoursSpent || 0),
    partsUsed: log.partsUsed || "",
    notes: log.notes || "",
    createdAt,
    updatedAt: log.updatedAt || createdAt,
  };
}

export async function getAllServiceLogs() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.map(normalizeServiceLog) : [];
}

export async function saveAllServiceLogs(logs = []) {
  const normalized = logs.map(normalizeServiceLog);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getServiceLogsByTask(taskId) {
  const token = await api.getStoredToken();
  if (!token) throw new Error("Please sign in again before viewing service notes.");

  const result = await api.fetchTask(token, taskId);
  if (!result.success) throw new Error(result.error || "Unable to load service notes.");

  const logs = Array.isArray(result.task?.serviceLogs)
    ? result.task.serviceLogs
    : Array.isArray(result.task?.payload?.serviceLogs)
      ? result.task.payload.serviceLogs
      : [];
  const normalized = logs.map(normalizeServiceLog).map((log) => ({ ...log, taskId: log.taskId || taskId }));
  await saveAllServiceLogs(normalized);
  return normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function getServiceLogById(taskId, logId) {
  const logs = await getServiceLogsByTask(taskId);
  return logs.find((log) => String(log.id) === String(logId)) || null;
}

export async function upsertServiceLog(log = {}) {
  if (!log.taskId) throw new Error("A work order is required to save a service note.");
  const token = await api.getStoredToken();
  if (!token) throw new Error("Please sign in again before saving a service note.");

  const logs = await getServiceLogsByTask(log.taskId);
  const existing = log.id
    ? logs.find((item) => String(item.id) === String(log.id))
    : null;
  const normalized = normalizeServiceLog({
    ...existing,
    ...log,
    createdAt: existing?.createdAt || log.createdAt,
    updatedAt: new Date().toISOString(),
  });
  const next = existing
    ? logs.map((item) => (String(item.id) === String(normalized.id) ? normalized : item))
    : [normalized, ...logs];
  const result = await api.patchTask(token, log.taskId, { serviceLogs: next });
  if (!result.success) throw new Error(result.error || "Unable to save this service note.");

  const saved = Array.isArray(result.task?.serviceLogs)
    ? result.task.serviceLogs.map(normalizeServiceLog)
    : next;
  await saveAllServiceLogs(saved);
  return saved.find((item) => String(item.id) === String(normalized.id)) || normalized;
}

export async function deleteServiceLog(taskId, logId) {
  const token = await api.getStoredToken();
  if (!token) throw new Error("Please sign in again before deleting a service note.");

  const logs = await getServiceLogsByTask(taskId);
  const next = logs.filter((log) => String(log.id) !== String(logId));
  const result = await api.patchTask(token, taskId, { serviceLogs: next });
  if (!result.success) throw new Error(result.error || "Unable to delete this service note.");
  await saveAllServiceLogs(next);
  return true;
}

export async function getLogDraft(taskId) {
  const raw = await AsyncStorage.getItem(`${DRAFT_KEY}_${taskId}`);
  return safeParse(raw, null);
}

export async function saveLogDraft(taskId, draft) {
  await AsyncStorage.setItem(`${DRAFT_KEY}_${taskId}`, JSON.stringify(draft || {}));
}

export async function clearLogDraft(taskId) {
  await AsyncStorage.removeItem(`${DRAFT_KEY}_${taskId}`);
}
