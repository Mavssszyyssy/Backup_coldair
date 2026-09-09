// Callback query parameters are navigation hints, never proof of payment.
export function paymentOutcome(order, returnState, { checking = false, error = false } = {}) {
  if (checking) return { kind: "checking", title: "Checking payment", body: "Please wait while we verify your order's payment status." };
  if (error || !order) return { kind: "unknown", title: "Unable to confirm payment", body: "We could not verify the transaction. Check the status again before attempting another payment." };
  const status = String(order.paymentStatus || "").toLowerCase();
  if (status === "paid") return { kind: "paid", title: "Payment successful", body: "Your payment is confirmed. You can track your order in My Orders." };
  const online = order.paymentProvider === "paymongo" || ["gcash", "card"].includes(order.paymentMethod);
  if (!online) return { kind: "received", title: "Order received", body: "Your cash-on-delivery order is saved. Payment will be collected on delivery after arrival is confirmed." };
  if (["failed", "expired", "cancelled"].includes(status) || ["cancelled", "returned"].includes(returnState)) {
    return { kind: "failed", title: "Transaction Failed", body: "Checkout was closed or payment was not completed. Your order is saved, but payment is not confirmed. If you were charged, check the status again before paying." };
  }
  return { kind: "pending", title: "Payment pending", body: "Your order is saved, but payment is not confirmed yet. Check the status again before paying." };
}

