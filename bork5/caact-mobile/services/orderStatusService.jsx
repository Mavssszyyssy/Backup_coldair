export function resolveOrderDeliveryStatus(workflowStatus = "", fallback = "") {
  const workflow = String(workflowStatus || "").toLowerCase();
  if (workflow === "complete") return "DELIVERED";
  if (workflow === "cancelled") return "FAILED_ATTEMPT";
  if (fallback) return fallback;
  if (workflow === "to_deliver") return "PREPARING";
  if (workflow === "to_dispatch") return "PREPARING";
  if (workflow === "for_rescheduling") return "FAILED_ATTEMPT";
  if (workflow === "to_install") return "OUT_FOR_DELIVERY";
  return "NOT_STARTED";
}

export function resolveOrderTimelineEndState(workflowStatus = "", steps = []) {
  const workflow = String(workflowStatus || "").toLowerCase();
  const finalStage = String(steps[steps.length - 1]?.stage || "").toLowerCase();
  if (workflow === "complete" && (!finalStage || finalStage === "completed")) return "completed";
  if (workflow === "cancelled" && finalStage === "cancelled") return "cancelled";
  return "current";
}
