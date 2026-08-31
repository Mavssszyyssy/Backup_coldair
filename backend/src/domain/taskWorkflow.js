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

module.exports = {
  TASK_STATUSES,
  getTaskMutationBlocker,
  normalizeTaskStatus,
  parseTaskStatus,
};
