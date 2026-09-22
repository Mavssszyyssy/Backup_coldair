const firstParam = (value) => Array.isArray(value) ? value[0] : value;

const allowedStatusFilters = new Set([
  "all",
  "active",
  "pending",
  "on-hold",
  "completed",
  "cancelled",
]);
const allowedScheduleFilters = new Set(["today", "upcoming", "all"]);

export const workOrderRouteFilters = (params = {}) => {
  const requestedStatus = String(firstParam(params.status) || "").trim().toLowerCase();
  const requestedSchedule = String(firstParam(params.schedule) || "").trim().toLowerCase();
  const searchQuery = String(firstParam(params.search) || "").trim();

  return {
    status: allowedStatusFilters.has(requestedStatus) ? requestedStatus : "all",
    schedule: allowedScheduleFilters.has(requestedSchedule) ? requestedSchedule : "today",
    search: searchQuery,
  };
};
