const ACTIVE_SERVICE_REQUEST_STATUSES = new Set([
  "pending",
  "submitted",
  "reviewed",
  "assigned",
  "in progress",
]);

const taskCheckIn = (task = {}) => task?.checkIn || task?.payload?.checkIn || null;

export function isActiveServiceRequest(request = {}) {
  return ACTIVE_SERVICE_REQUEST_STATUSES.has(
    String(request?.status || "").trim().toLowerCase().replace(/[_-]+/g, " "),
  );
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
