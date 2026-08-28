export function resolveOrderDeliveryStatus(workflowStatus = "", fallback = "") {
  const workflow = String(workflowStatus || "").toLowerCase();
  if (workflow === "complete") return "DELIVERED";
  if (workflow === "cancelled") return "FAILED_ATTEMPT";
  if (fallback) return fallback;
  if (workflow === "to_deliver") return "PREPARING";
  if (workflow === "to_install") return "OUT_FOR_DELIVERY";
  return "NOT_STARTED";
}
