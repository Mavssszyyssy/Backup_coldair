const clockMinutes = (value = "") => {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (hour === 12) hour = 0;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return (hour * 60) + minute;
};

export const parseScheduleSlot = (value = "") => {
  const parts = String(value).trim().split(/\s*(?:–|—|-)\s*/);
  if (parts.length !== 2) return null;
  const start = clockMinutes(parts[0]);
  const end = clockMinutes(parts[1]);
  return start !== null && end !== null && end > start ? { start, end } : null;
};

export const scheduleSlotsOverlap = (left, right) => {
  const first = typeof left === "string" ? parseScheduleSlot(left) : left;
  const second = typeof right === "string" ? parseScheduleSlot(right) : right;
  return Boolean(first && second && first.start < second.end && second.start < first.end);
};

const activeScheduleTask = (task = {}) => !["completed", "cancelled", "failed", "rescheduled"]
  .includes(String(task.status || "").toLowerCase());

export const taskIncludesTechnician = (task = {}, technicianId = "") => {
  const id = String(technicianId || "");
  return Boolean(id) && (
    String(task.assignedTechnicianId || "") === id
    || (task.schedule?.teamMemberIds || []).map(String).includes(id)
  );
};

export const technicianHasConflict = (tasks = [], {
  technicianId,
  scheduledDate,
  timeSlot,
  excludeTaskId = "",
} = {}) => (Array.isArray(tasks) ? tasks : []).some((task) => (
  activeScheduleTask(task)
  && String(task.id || task._id || "") !== String(excludeTaskId || "")
  && String(task.scheduledDate || "") === String(scheduledDate || "")
  && taskIncludesTechnician(task, technicianId)
  && scheduleSlotsOverlap(task.timeSlot, timeSlot)
));
