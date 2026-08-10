// services/partsRequestService.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "./api";

const TECH_PARTS_KEY = "parts_requests_storage_v2";

export const PARTS_REQUEST_STATUS = {
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  ASSIGNED: "Assigned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizePartsRequest(request = {}) {
  const requestedAt = request.requestedAt || request.createdAt || new Date().toISOString();
  return {
    id: request.id || `parts_request_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    taskId: request.taskId || "",
    technicianId: request.technicianId || request.requestedBy || "",
    technicianName: request.technicianName || "",
    inventoryItemId: request.inventoryItemId || "",
    partName: request.partName || request.name || "",
    quantity: Number(request.quantity || 1),
    reason: request.reason || "",
    priority: request.priority || "Normal",
    status: request.status || PARTS_REQUEST_STATUS.SUBMITTED,
    requestedAt,
    updatedAt: request.updatedAt || requestedAt,
  };
}

async function getAllPartsRequests() {
  const raw = await AsyncStorage.getItem(TECH_PARTS_KEY);
  const all = safeParse(raw, []);
  return Array.isArray(all) ? all.map(normalizePartsRequest) : [];
}

async function saveAllPartsRequests(requests = []) {
  const normalized = requests.map(normalizePartsRequest);
  await AsyncStorage.setItem(TECH_PARTS_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getPartsRequestsByTechnician(techId) {
  try {
    const token = await api.getStoredToken();
    if (token) {
      const result = await api.fetchMyPartsRequests(token);
      if (result.success) {
        const existing = await getAllPartsRequests();
        const otherTechnicians = existing.filter(
          (request) => String(request.technicianId) !== String(techId),
        );
        const mine = result.requests.map(normalizePartsRequest);
        await saveAllPartsRequests([...mine, ...otherTechnicians]);
        return mine;
      }
      throw new Error(result.error || "Unable to load parts requests.");
    }
  } catch (error) {
    if (error?.message && !/network request failed|failed to fetch|timed out/i.test(error.message)) {
      throw error;
    }
  }
  const all = await getAllPartsRequests();
  return all.filter((r) => String(r.technicianId) === String(techId));
}

export async function savePartsRequest(req) {
  const token = await api.getStoredToken();
  if (!token) throw new Error("Please sign in again before submitting a parts request.");
  const result = await api.createPartsRequest(token, req);
  if (!result.success) throw new Error(result.error || "Unable to submit the parts request.");
  const all = await getAllPartsRequests();
  const created = normalizePartsRequest(result.request);
  await saveAllPartsRequests([created, ...all.filter((item) => String(item.id) !== String(created.id))]);
  return created;
}

export async function updatePartsRequestStatus(requestId, status) {
  const all = await getAllPartsRequests();
  const updated = all.map((r) =>
    String(r.id) === String(requestId)
      ? normalizePartsRequest({ ...r, status, updatedAt: new Date().toISOString() })
      : r,
  );
  await AsyncStorage.setItem(TECH_PARTS_KEY, JSON.stringify(updated));
}
