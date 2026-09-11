const TASK_STATUSES = new Set([
  "pending",
  "accepted",
  "on-the-way",
  "arrived",
  "installing",
  "in-progress",
  "on-hold",
  "failed",
  "rescheduled",
  "cancelled",
  "completed",
]);

const normalizeTaskStatusValue = (value = "") =>
  String(value || "").toLowerCase().trim().replace(/[\s_]+/g, "-");

const parseTaskStatus = (value = "") => {
  const normalized = normalizeTaskStatusValue(value);
  return TASK_STATUSES.has(normalized) ? normalized : null;
};

const normalizeTaskStatus = (value = "") => parseTaskStatus(value) || "pending";

const getTaskMutationBlocker = (status = "") => {
  const normalized = parseTaskStatus(status);
  if (normalized === "completed") {
    return "Completed work orders are locked and cannot be reopened or edited.";
  }
  if (normalized === "cancelled") {
    return "Cancelled work orders are locked. Create a new work order if service is still needed.";
  }
  return "";
};

const hasVerifiedTaskCheckIn = (task) => {
  if (task?.payload?.visitAttempt?.awaitingAdmin) return false;
  const point = task?.payload?.checkIn;
  if (!point || !point.checkedInAt || !Number.isFinite(new Date(point.checkedInAt).getTime())) return false;
  const valid = (value, limit) => value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
  return valid(point.latitude, 90) && valid(point.longitude, 180);
};

const isOrderInstallationTask = (task) => Boolean(
  (task?.payload?.orderId || task?.payload?.orderCode) &&
  !String(task?.payload?.requestId || task?.requestId || "").trim(),
);

const hasCustomerPresentArrival = (task) => {
  if (!isOrderInstallationTask(task) || !hasVerifiedTaskCheckIn(task)) return false;
  const validation = task?.payload?.arrivalValidation;
  return Boolean(
    validation?.customerPresent === true &&
    validation?.checkedInAt &&
    validation.checkedInAt === task.payload.checkIn.checkedInAt,
  );
};

const installationArrivalBlocker = (task) =>
  isOrderInstallationTask(task) && !hasCustomerPresentArrival(task)
    ? "Confirm that the customer is present after GPS check-in before starting installation. If nobody is present, submit Failed to Install with a proof photo."
    : "";

module.exports = {
  hasCustomerPresentArrival,
  hasVerifiedTaskCheckIn,
  installationArrivalBlocker,
  isOrderInstallationTask,
  TASK_STATUSES,
  getTaskMutationBlocker,
  normalizeTaskStatus,
  parseTaskStatus,
};
