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
