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

export function getPaymentRetryState(order = {}) {
  const method = String(order.paymentMethod || "").toLowerCase();
  const status = String(order.paymentStatus || "").toLowerCase();
  const isGcash = method === "gcash";
  const onlineMethod = ["gcash", "credit", "card", "maya", "paymaya", "online"].includes(method);
  const attemptCount = Number(order.paymentRetryCount ?? order.paymongo?.retryAttempts ?? 0);
  const activeOrder = onlineMethod && String(order.paymentProvider || "").toLowerCase() === "paymongo" &&
    String(order.workflowStatus || "").toLowerCase() === "to_pay";
  const resuming = activeOrder && isGcash && status === "pending" && !order.paymongo?.retryInProgress &&
    Boolean(order.paymongo?.checkoutSessionId && (order.paymentUrl || order.paymongo?.checkoutUrl));
  const limitReached = activeOrder && isGcash && status !== "paid" && attemptCount >= 3 && !resuming;
  const retryableFailure = ["failed", "cancelled", "expired"].includes(status);
  const eligible = activeOrder && (resuming || (retryableFailure && !limitReached));
  return { eligible, limitReached, isGcash, resuming };
}

export function getOrderRecipient(order = {}) {
  const address = order.address && typeof order.address === "object" ? order.address : {};
  return {
    name: String(address.name || order.customerName || "").trim(),
    phone: String(address.phone || order.customerPhone || "").trim(),
    email: String(order.customerEmail || "").trim(),
  };
}

export function formatOrderDeliveryAddress(order = {}) {
  if (typeof order.address === "string") return order.address.trim();
  const address = order.address || {};
  return [address.street, address.barangay, address.city, address.province, address.region, address.postalCode]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function orderPaymentMethodLabel(order = {}) {
  const method = String(order.paymentMethod || "").toLowerCase();
  if (method === "cod") return "Cash on delivery";
  if (["credit", "card"].includes(method)) return "Card";
  if (method === "gcash") return "GCash";
  if (["maya", "paymaya"].includes(method)) return "Maya";
  return "Online payment";
}
