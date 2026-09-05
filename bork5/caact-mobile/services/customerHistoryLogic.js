const ACTIVE_SERVICE_REQUEST_STATUSES = new Set([
  "pending",
  "submitted",
  "reviewed",
  "assigned",
  "in progress",
]);

const CUSTOMER_CANCELLABLE_SERVICE_REQUEST_STATUSES = new Set([
  "pending",
  "submitted",
  "reviewed",
  "assigned",
]);

function normalizeStatus(value = "") {
  return String(value).trim().toLowerCase().replace(/[_-]+/g, " ");
}

const taskCheckIn = (task = {}) => task?.checkIn || task?.payload?.checkIn || null;

export function isActiveServiceRequest(request = {}) {
  return ACTIVE_SERVICE_REQUEST_STATUSES.has(normalizeStatus(request?.status));
}

export function canCustomerCancelServiceRequest(requestOrStatus = {}) {
  const status = typeof requestOrStatus === "string"
    ? requestOrStatus
    : requestOrStatus?.status;
  return CUSTOMER_CANCELLABLE_SERVICE_REQUEST_STATUSES.has(normalizeStatus(status));
}

export function getLatestTaskCheckIn(linkedTasks = []) {
  return linkedTasks
    .map((task) => ({ task, checkIn: taskCheckIn(task) }))
    .filter(({ checkIn }) => checkIn?.checkedInAt)
    .sort(
      (left, right) =>
        new Date(right.checkIn.checkedInAt).getTime() -
        new Date(left.checkIn.checkedInAt).getTime(),
    )[0] || null;
}

// A previous visit is history, not proof that the current technician arrived.
export function getUnitVisitCheckIn(requests = [], linkedTasks = []) {
  const activeRequests = requests.filter(isActiveServiceRequest);
  const activeIds = new Set(activeRequests.map((request) => String(request.id || request._id || "")).filter(Boolean));
  const activeTaskIds = new Set(activeRequests.map((request) => String(request.linkedTaskId || "")).filter(Boolean));
  const activeTasks = linkedTasks.filter((task) => !["completed", "cancelled", "canceled"].includes(normalizeStatus(task.status)));
  const hasCurrentVisit = activeRequests.length > 0 || activeTasks.length > 0;
  const candidates = activeRequests.length
    ? activeTasks.filter((task) => activeTaskIds.has(String(task.id || task._id || "")) || activeIds.has(String(task.requestId || task.payload?.requestId || "")))
    : hasCurrentVisit ? activeTasks : linkedTasks.filter((task) => !["cancelled", "canceled"].includes(normalizeStatus(task.status)));
  return { hasCurrentVisit, record: getLatestTaskCheckIn(candidates) };
}
