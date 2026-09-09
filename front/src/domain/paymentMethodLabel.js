export const paymentMethodLabel = (method) => ({
  cod: "Cash on Delivery", gcash: "GCash", credit: "Credit / debit card", card: "Credit / debit card",
  maya: "Maya", paymaya: "Maya",
  pay_on_install: "Payment upon installation (legacy order)", pay_on_installation: "Payment upon installation (legacy order)",
})[String(method || "").toLowerCase()] || "Online payment (method not recorded)";
