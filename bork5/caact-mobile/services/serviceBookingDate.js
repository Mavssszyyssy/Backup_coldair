export const getManilaDateKey = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const addCalendarDays = (dateKey, days) => {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

export const getServiceBookingMaxDateKey = (now = new Date()) => addCalendarDays(getManilaDateKey(now), 90);

export const serviceBookingDateError = (dateKey, now = new Date()) => {
  if (!dateKey) return "Choose your preferred appointment date.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isFinite(Date.parse(`${dateKey}T00:00:00Z`)) ||
    new Date(`${dateKey}T00:00:00Z`).toISOString().slice(0, 10) !== dateKey) return "Choose a valid appointment date.";
  if (dateKey < getManilaDateKey(now)) return "Please choose today or a future date.";
  if (dateKey > getServiceBookingMaxDateKey(now)) return "Choose a date within 90 calendar days from today.";
  return "";
};
