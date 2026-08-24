// services/serviceRequestStorage.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "./api";

const STORAGE_KEY = "service_requests_storage_v2";

export const SERVICE_REQUEST_STATUS = {
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function createTimelineEvent({ title, description = "", actor = "System", timestamp }) {
  return {
    id: `service_timeline_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    title: title || "Service Request Updated",
    description: description || "",
    actor: actor || "System",
    timestamp: timestamp || new Date().toISOString(),
  };
}

function normalizeNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeServiceRequest(item = {}) {
  const createdAt = item.createdAt || new Date().toISOString();
  const issueDescription = item.issueDescription || item.concern || item.issue || "";
  const preferredDate = item.preferredDate || item.preferredSchedule || "";
  const payload = item.payload && typeof item.payload === "object" ? item.payload : {};

  return {
    id: item.id || `service_request_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    userId: item.userId || item.customerId || item.createdBy || null,
    customerName: item.customerName || item.customer || "",
    customerEmail: item.customerEmail || "",
    customerPhone: item.customerPhone || "",
    unitId: item.unitId || null,
    unitName: item.unitName || item.unitType || payload.unitName || "",
    serviceType: item.serviceType || item.issueType || payload.serviceType || "",
    serviceId: item.serviceId || payload.serviceId || "",
    pricing: item.pricing || payload.pricing || null,
    issueType: item.issueType || "",
    issueDescription,
    concern: issueDescription,
    unitType: item.unitType || item.unitName || "",
    unitSerialNumber: item.unitSerialNumber || item.serialNumber || payload.unitSerialNumber || "",
    qrCode: item.qrCode || payload.qrCode || "",
    address: item.address || "",
    landmark: item.landmark || "",
    plusCode: item.plusCode || "",
    deliveryInstructions: item.deliveryInstructions || "",
    latitude: normalizeNumberOrNull(item.latitude),
    longitude: normalizeNumberOrNull(item.longitude),
    preferredDate,
    preferredSchedule: preferredDate,
    assignedTechnicianId: item.assignedTechnicianId || "",
    assignedTechnicianName: item.assignedTechnicianName || "",
    linkedTaskId: item.linkedTaskId || item.taskId || payload.linkedTaskId || "",
    taskCode: item.taskCode || payload.taskCode || "",
    branch: item.branch || payload.branch || "",
    status: item.status || SERVICE_REQUEST_STATUS.SUBMITTED,
    notes: item.notes || "",
    completedAt: item.completedAt || payload.completedAt || null,
    timeline:
      Array.isArray(item.timeline) && item.timeline.length > 0
        ? item.timeline
        : [
            createTimelineEvent({
              title: "Request Submitted",
              description: "Service request submitted successfully.",
              actor: item.customerName || "Customer",
              timestamp: createdAt,
            }),
          ],
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

export async function getAllServiceRequests() {
  try {
    const token = await api.getStoredToken();
    if (token) {
      const result = await api.fetchMyServiceRequests(token);
      if (result.success) {
        await saveAllServiceRequests(result.requests);
        return result.requests.map(normalizeServiceRequest);
      }
    }
  } catch {}

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.map(normalizeServiceRequest) : [];
}

export async function saveAllServiceRequests(items = []) {
  const normalized = items.map(normalizeServiceRequest);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function createServiceRequest(payload = {}) {
  const token = await api.getStoredToken();
  if (!token) {
    throw new Error("Please sign in again before submitting a service request.");
  }

  const result = await api.createMyServiceRequest(token, payload);
  if (!result.success) {
    throw new Error(result.error || "Unable to create service request.");
  }
  const created = normalizeServiceRequest(result.request);
  const requests = await getAllServiceRequests();
  await saveAllServiceRequests([
    created,
    ...requests.filter((item) => String(item.id) !== String(created.id)),
  ]);
  return created;
}

export async function getServiceRequestById(requestId) {
  const requests = await getAllServiceRequests();
  return requests.find((item) => String(item.id) === String(requestId)) || null;
}

export async function getServiceRequestsByUser(userId) {
  const requests = await getAllServiceRequests();
  return requests.filter((item) => String(item.userId) === String(userId));
}

export async function updateServiceRequest(requestId, patch = {}) {
  void patch;
  throw new Error(
    `Service request ${requestId} can only be updated through the approved server workflow.`,
  );
}

export async function updateServiceRequestStatus(
  requestId,
  status,
  actor = "System",
  description = ""
) {
  const token = await api.getStoredToken();
  if (!token) {
    throw new Error("Please sign in again before updating a service request.");
  }

  const result = await api.patchServiceRequestStatus(token, requestId, {
    status,
    actor,
    description,
  });
  if (!result.success) {
    throw new Error(result.error || "Unable to update service request.");
  }
  const updated = normalizeServiceRequest(result.request);
  const requests = await getAllServiceRequests();
  await saveAllServiceRequests(
    requests.map((item) => (String(item.id) === String(requestId) ? updated : item)),
  );
  return updated;
}

export async function cancelServiceRequest(
  requestId,
  actor = "Customer",
  description = "Request cancelled by customer."
) {
  const request = await getServiceRequestById(requestId);

  if (!request) {
    throw new Error("Service request not found.");
  }

  const currentStatus = String(request.status || "");

  if (
    currentStatus === SERVICE_REQUEST_STATUS.IN_PROGRESS ||
    currentStatus === SERVICE_REQUEST_STATUS.COMPLETED
  ) {
    throw new Error("This service request can no longer be cancelled.");
  }

  if (currentStatus === SERVICE_REQUEST_STATUS.CANCELLED) {
    throw new Error("This service request is already cancelled.");
  }

  return updateServiceRequestStatus(
    requestId,
    SERVICE_REQUEST_STATUS.CANCELLED,
    actor,
    description
  );
}

export async function assignTechnicianToServiceRequest(
  requestId,
  technicianId,
  technicianName,
  linkedTaskId = "",
  actor = "Admin"
) {
  const token = await api.getStoredToken();
  if (!token) {
    throw new Error("Please sign in again before assigning a technician.");
  }

  const result = await api.patchServiceRequestStatus(token, requestId, {
    status: SERVICE_REQUEST_STATUS.ASSIGNED,
    assignedTechnicianId: technicianId || "",
    assignedTechnicianName: technicianName || "",
    linkedTaskId,
    actor,
  });
  if (!result.success) {
    throw new Error(result.error || "Unable to assign technician.");
  }
  const updated = normalizeServiceRequest(result.request);
  const requests = await getAllServiceRequests();
  await saveAllServiceRequests(
    requests.map((item) => (String(item.id) === String(requestId) ? updated : item)),
  );
  return updated;
}
