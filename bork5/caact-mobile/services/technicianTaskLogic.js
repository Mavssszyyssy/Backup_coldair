const text = (value) => String(value || "").trim();

export const ROOM_SIZE_OPTIONS = [6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50].map((size) => ({
  id: String(size),
  value: size,
  label: `Approximately ${size} m²`,
}));

export function getTaskSerialNumbers(task = {}) {
  const progressSerials = Array.isArray(task?.registrationProgress?.requiredSerials)
    ? task.registrationProgress.requiredSerials
    : [];
  const directSerials = Array.isArray(task?.serialNumbers) ? task.serialNumbers : [];
  const itemSerials = (Array.isArray(task?.items) ? task.items : []).flatMap((item = {}) => [
    ...(Array.isArray(item?.serialNumbers) ? item.serialNumbers : []),
    ...(Array.isArray(item?.serialUnits) ? item.serialUnits.map((unit) => unit?.serialNumber) : []),
  ]);
  return Array.from(new Set([...progressSerials, ...directSerials, ...itemSerials]
    .map((serial) => text(serial))
    .filter(Boolean)));
}

export function isInstallationWorkOrder(task = {}) {
  if (!task || typeof task !== "object") return false;
  if (getTaskSerialNumbers(task).length > 0) return true;
  if (text(task.requestId || task?.payload?.requestId)) return false;
  if (text(task.orderId || task.orderCode || task?.payload?.orderId || task?.payload?.orderCode)) return true;
  const description = [task.title, task.issueType, task.description, task?.payload?.source]
    .map((value) => text(value).toLowerCase())
    .join(" ");
  return /\b(install|installation|delivery|fulfillment)\b/.test(description);
}

export function formatWarrantyStatus(status, { installationPending = false } = {}) {
  const normalized = text(status).toLowerCase().replace(/[\s-]+/g, "_");
  const labels = {
    pending_activation: "Pending activation",
    active: "Active",
    expired: "Expired",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
    void: "Void",
  };
  if (labels[normalized]) return labels[normalized];
  return installationPending ? "Activates after verified installation" : "Not available for this work order";
}

export function suggestedServiceType(task = {}) {
  if (!task || typeof task !== "object") return "inspection";
  const source = `${task.issueType || ""} ${task.title || ""} ${task.description || ""}`.toLowerCase();
  if (source.includes("warranty") || source.includes("repair")) return "repair";
  if (source.includes("deep")) return "deep_cleaning";
  if (source.includes("clean") || source.includes("maintenance")) return "regular_cleaning";
  return "inspection";
}
