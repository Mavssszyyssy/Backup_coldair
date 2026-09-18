const normalizedStatus = (status = "") => String(status).trim().toLowerCase().replace(/[_\s]+/g, "-");

const timestamp = (...values) => {
  for (const value of values) {
    const time = new Date(value || "").getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
};

const startMinutes = (value = "") => {
  const match = String(value).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
};

// Active work stays visible first. Completed work is deliberately ordered by
// its completion time, newest first, so a technician can find recent work.
export const sortTechnicianWorkOrders = (all = []) => [...all].sort((a, b) => {
  const rank = {
    arrived: 0,
    installing: 0,
    "in-progress": 0,
    "on-the-way": 0,
    accepted: 1,
    pending: 2,
    "on-hold": 3,
    rescheduled: 4,
    failed: 5,
    completed: 6,
    cancelled: 7,
  };
  const aStatus = normalizedStatus(a?.status);
  const bStatus = normalizedStatus(b?.status);
  const rankDifference = (rank[aStatus] ?? 3) - (rank[bStatus] ?? 3);
  if (rankDifference) return rankDifference;

  if (aStatus === "completed" && bStatus === "completed") {
    return timestamp(b.completedAt, b.updatedAt, b.createdAt) - timestamp(a.completedAt, a.updatedAt, a.createdAt);
  }

  const dateDifference = String(a?.scheduledDate || "9999-12-31").localeCompare(String(b?.scheduledDate || "9999-12-31"));
  if (dateDifference) return dateDifference;
  const timeDifference = startMinutes(a?.timeSlot) - startMinutes(b?.timeSlot);
  if (timeDifference) return timeDifference;
  return timestamp(b?.updatedAt, b?.createdAt) - timestamp(a?.updatedAt, a?.createdAt);
});
