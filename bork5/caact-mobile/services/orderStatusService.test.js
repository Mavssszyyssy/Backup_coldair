import { formatOrderDeliveryAddress, getOrderRecipient, getPaymentRetryState, orderPaymentMethodLabel, resolveOrderTimelineEndState } from "./orderStatusService";

test("order details use the saved recipient and complete delivery address", () => {
  const order = { customerName: "Account Name", customerEmail: "customer@example.com", paymentMethod: "gcash", address: { name: "Delivery Recipient", phone: "09123456789", street: "123 Sample Street", barangay: "Malhacan", city: "Meycauayan", province: "Bulacan", region: "Central Luzon", postalCode: "3020" } };
  expect(getOrderRecipient(order)).toEqual({ name: "Delivery Recipient", phone: "09123456789", email: "customer@example.com" });
  expect(formatOrderDeliveryAddress(order)).toBe("123 Sample Street, Malhacan, Meycauayan, Bulacan, Central Luzon, 3020");
  expect(orderPaymentMethodLabel(order)).toBe("GCash");
});

test("completed orders finish with a check instead of a current-stage marker", () => {
  expect(resolveOrderTimelineEndState("complete", [{ stage: "placed" }, { stage: "completed" }])).toBe("completed");
  expect(resolveOrderTimelineEndState("complete", [{ label: "Submitted" }, { label: "Completed" }])).toBe("completed");
});

test("active or reopened installations still show the current stage", () => {
  expect(resolveOrderTimelineEndState("to_install", [{ stage: "installation" }])).toBe("current");
  expect(resolveOrderTimelineEndState("complete", [{ stage: "visit:scheduled" }])).toBe("current");
});

test("cancelled orders use a distinct terminal marker", () => {
  expect(resolveOrderTimelineEndState("cancelled", [{ stage: "cancelled" }])).toBe("cancelled");
});

test("payment retry controls match the server's eligible states", () => {
  const base = { paymentProvider: "paymongo", workflowStatus: "to_pay", paymentMethod: "gcash", paymentStatus: "pending", paymentRetryCount: 1, paymongo: { checkoutSessionId: "cs_1", checkoutUrl: "https://checkout.example/test" } };
  expect(getPaymentRetryState(base).eligible).toBe(true);
  expect(getPaymentRetryState({ ...base, paymongo: null }).eligible).toBe(false);
  expect(getPaymentRetryState({ ...base, paymentRetryCount: 3 })).toMatchObject({ eligible: true, limitReached: false, resuming: true });
  expect(getPaymentRetryState({ ...base, paymentRetryCount: 3, paymentStatus: "failed" })).toMatchObject({ eligible: false, limitReached: true });
  expect(getPaymentRetryState({ ...base, paymentStatus: "paid" }).eligible).toBe(false);
  expect(getPaymentRetryState({ ...base, paymentMethod: "card", paymentStatus: "pending" })).toMatchObject({ eligible: true, resuming: true });
  expect(getPaymentRetryState({ ...base, paymentMethod: "card", paymentStatus: "pending", paymongo: null }).eligible).toBe(false);
  expect(getPaymentRetryState({ ...base, paymentMethod: "card", paymentStatus: "failed" }).eligible).toBe(true);
  expect(getPaymentRetryState({ ...base, workflowStatus: "cancelled" }).eligible).toBe(false);
  expect(getPaymentRetryState({ ...base, paymentMethod: "cod", paymentStatus: "failed" }).eligible).toBe(false);
  expect(getPaymentRetryState({ ...base, paymongo: { ...base.paymongo, retryInProgress: true } }).eligible).toBe(false);
});
