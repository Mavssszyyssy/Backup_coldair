const timestamp = (value) => {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
};

const startMinutes = (value = "") => {
  const match = String(value).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
};

const latestActivityTime = (task = {}) => Math.max(
  timestamp(task.completedAt),
  timestamp(task.updatedAt),
  timestamp(task.proofSubmittedAt),
  timestamp(task.proof?.submittedAt),
  timestamp(task.createdAt),
);

const scheduleTime = (task = {}) => {
  const scheduledDay = timestamp(task.scheduledDate);
  if (!scheduledDay) return 0;
  const minutes = startMinutes(task.timeSlot);
  return scheduledDay + (Number.isFinite(minutes) && minutes !== Number.MAX_SAFE_INTEGER ? minutes * 60 * 1000 : 0);
};

// The Work Orders list is an activity history. Keep its order independent of
// status so a newly completed job is not hidden below older active records.
export const sortTechnicianWorkOrders = (all = []) => [...all].sort((a, b) => {
  const activityDifference = latestActivityTime(b) - latestActivityTime(a);
  if (activityDifference) return activityDifference;

  // Legacy cached work orders may not have timestamps. Keep those predictable
  // by falling back to their most recent scheduled slot and then a stable id.
  const scheduleDifference = scheduleTime(b) - scheduleTime(a);
  if (scheduleDifference) return scheduleDifference;
  return String(b?.id || b?.taskCode || "").localeCompare(String(a?.id || a?.taskCode || ""));
});
