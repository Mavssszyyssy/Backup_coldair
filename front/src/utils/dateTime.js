export const BUSINESS_TIME_ZONE = "Asia/Manila";

export const formatBusinessDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const getWorkOrderDateWindow = (now = new Date(), service = false) => {
  const min = formatBusinessDateKey(now);
  const [year, month, day] = min.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year + 2, month, 0)).getUTCDate();
  const end = service
    ? new Date(Date.UTC(year, month - 1, day + 90))
    : new Date(Date.UTC(year + 2, month - 1, Math.min(day, lastDay)));
  return { min, max: end.toISOString().slice(0, 10) };
};

export const getWorkOrderDateSelectionError = (value, service = false, now = new Date()) => {
  const { min, max } = getWorkOrderDateWindow(now, service);
  if (!value || value < min) return "Choose today or a future date.";
  if (value > max) {
    return service
      ? "Choose a date within 90 calendar days from today."
      : "Choose a work order date within two calendar years from today.";
  }
  return "";
};

const displayDate = (value, options) => {
  if (!value) return "";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  const date = dateOnly ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: dateOnly ? "UTC" : BUSINESS_TIME_ZONE,
    ...options,
  }).format(date);
};

export const formatBusinessDate = (value) => displayDate(value);
export const formatBusinessDateTime = (value) => displayDate(value, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
