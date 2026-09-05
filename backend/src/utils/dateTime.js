const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Manila";

const formatDateKeyInTimeZone = (
  value = new Date(),
  timeZone = process.env.APP_TIME_ZONE || DEFAULT_BUSINESS_TIME_ZONE,
) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

module.exports = {
  DEFAULT_BUSINESS_TIME_ZONE,
  formatDateKeyInTimeZone,
  businessDay: (value = new Date()) => {
    const key = formatDateKeyInTimeZone(value);
    return key ? new Date(`${key}T00:00:00.000Z`) : null;
  },
  // Installation forms record Philippine local time, regardless of server location.
  parseInstallationDateTime: (date, time = "00:00") => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) return null;
    const value = new Date(`${date}T${time}:00+08:00`);
    return Number.isFinite(value.getTime()) && formatDateKeyInTimeZone(value) === date ? value : null;
  },
};
