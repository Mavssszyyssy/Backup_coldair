const taskRecordTime = (task = {}) => {
  for (const value of [task.updatedAt, task.completedAt, task.createdAt]) {
    const timestamp = new Date(value || "").getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
};

// A completion refresh can meet an older copy in a legacy device cache. Keep
// one authoritative, newest record per work order before saving or rendering.
export function normalizeTaskCollection(items = [], normalizeTask) {
  if (typeof normalizeTask !== "function") return [];
  const byIdentity = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeTask(item);
    const identity = String(normalized.id || normalized.taskCode || "").trim();
    if (!identity) return;
    const existing = byIdentity.get(identity);
    if (!existing || taskRecordTime(normalized) >= taskRecordTime(existing)) {
      byIdentity.set(identity, normalized);
    }
  });
  return [...byIdentity.values()];
}
