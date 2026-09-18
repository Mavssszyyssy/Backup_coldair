const manilaDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + (8 * 60 * 60 * 1000)).toISOString().slice(0, 10);
};

const scheduledDateKey = (value = "") => {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : manilaDateKey(text);
};

const statusKey = (value = "") => String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");

// A technician must see a visit they completed today even if an old schedule
// date was entered incorrectly or the work was completed ahead of schedule.
export const taskMatchesScheduleWindow = (task = {}, filter = "today", currentDate = manilaDateKey()) => {
  if (filter === "all") return true;
  const scheduledDate = scheduledDateKey(task.scheduledDate);
  if (filter === "upcoming") return scheduledDate > currentDate;
  return scheduledDate === currentDate || (
    statusKey(task.status) === "completed" && manilaDateKey(task.completedAt) === currentDate
  );
};

export { manilaDateKey };
