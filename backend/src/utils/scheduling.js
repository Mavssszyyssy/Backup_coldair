const getManilaDateKey = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const getScheduledDateError = (value, label = "Scheduled date") => {
  const date = String(value || "").trim();
  if (!date || date.toLowerCase() === "tbd") return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${label} must use a valid calendar date.`;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  const normalized = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  if (normalized !== date) return `${label} must use a valid calendar date.`;
  if (date < getManilaDateKey()) return `${label} cannot be in the past.`;
  return "";
};

module.exports = { getManilaDateKey, getScheduledDateError };
