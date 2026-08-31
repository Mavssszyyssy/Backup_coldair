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
};
