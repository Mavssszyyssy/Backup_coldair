// services/serviceRequestStorage.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const issueDescription = item.issueDescription || item.concern || "";
  const preferredDate = item.preferredDate || item.preferredSchedule || "";

  return {
    id: item.id || `service_request_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    userId: item.userId || null,
    customerName: item.customerName || "",
    customerEmail: item.customerEmail || "",
    customerPhone: item.customerPhone || "",
    unitId: item.unitId || null,
    unitName: item.unitName || item.unitType || "",
    serviceType: item.serviceType || item.issueType || "",
    issueType: item.issueType || "",
    issueDescription,
    concern: issueDescription,
    unitType: item.unitType || item.unitName || "",
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
    linkedTaskId: item.linkedTaskId || "",
    status: item.status || SERVICE_REQUEST_STATUS.SUBMITTED,
    notes: item.notes || "",
    completedAt: item.completedAt || null,
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

function appendTimeline(request, event) {
  const existing = Array.isArray(request.timeline) ? request.timeline : [];
  return [...existing, event];
}

export async function getAllServiceRequests() {
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
  const requests = await getAllServiceRequests();
  const created = normalizeServiceRequest(payload);
  const next = [created, ...requests];
  await saveAllServiceRequests(next);
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
  const requests = await getAllServiceRequests();
  const next = requests.map((item) =>
    String(item.id) === String(requestId)
      ? normalizeServiceRequest({
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
        })
      : item
  );

  await saveAllServiceRequests(next);
  return next.find((item) => String(item.id) === String(requestId)) || null;
}

export async function updateServiceRequestStatus(
  requestId,
  status,
  actor = "System",
  description = ""
) {
  const requests = await getAllServiceRequests();

  const next = requests.map((item) =>
    String(item.id) === String(requestId)
      ? normalizeServiceRequest({
          ...item,
          status,
          completedAt:
            String(status).toLowerCase() === "completed"
              ? new Date().toISOString()
              : item.completedAt || null,
          timeline: appendTimeline(
            item,
            createTimelineEvent({
              title: `Status changed to ${status}`,
              description: description || `Service request updated to ${status}.`,
              actor,
            })
          ),
          updatedAt: new Date().toISOString(),
        })
      : item
  );

  await saveAllServiceRequests(next);
  return next.find((item) => String(item.id) === String(requestId)) || null;
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
  const requests = await getAllServiceRequests();

  const next = requests.map((item) =>
    String(item.id) === String(requestId)
      ? normalizeServiceRequest({
          ...item,
          assignedTechnicianId: technicianId || "",
          assignedTechnicianName: technicianName || "",
          linkedTaskId: linkedTaskId || item.linkedTaskId || "",
          status: SERVICE_REQUEST_STATUS.ASSIGNED,
          timeline: appendTimeline(
            item,
            createTimelineEvent({
              title: "Technician Assigned",
              description: technicianName
                ? `${technicianName} was assigned to this request.`
                : "A technician was assigned to this request.",
              actor,
            })
          ),
          updatedAt: new Date().toISOString(),
        })
      : item
  );

  await saveAllServiceRequests(next);
  return next.find((item) => String(item.id) === String(requestId)) || null;
}
