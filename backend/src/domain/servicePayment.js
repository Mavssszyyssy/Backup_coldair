const servicePaymentSummary = (request) => {
  if (!request) return null;
  const saved = request.servicePayment || {};
  const warrantyCovered = Boolean(request.payload?.warrantyClaimId);
  const raw = saved.amount ?? request.payload?.pricing?.basePrice;
  const amount = warrantyCovered ? 0 : raw === null || raw === undefined || raw === "" ? null : Number(raw);
  const validAmount = Number.isFinite(amount) && amount >= 0 ? amount : null;
  return {
    amount: validAmount, currency: "PHP", method: "cash",
    status: warrantyCovered ? "warranty_covered" : saved.collectedAt ? "paid" : validAmount === null ? "quote_required" : validAmount === 0 ? "no_charge" : "due",
    collectedAt: saved.collectedAt || null, collectedBy: saved.collectedBy || "",
    quotedAt: saved.quotedAt || null, quoteId: saved.quoteId || "catalog",
  };
};
const servicePaymentBlocker = (request) => {
  const payment = servicePaymentSummary(request);
  if (!payment) return "The linked service request could not be found.";
  if (payment.status === "quote_required") return "Admin must set the service quote before this visit can be completed.";
  if (payment.status === "due") return "Confirm the service cash payment after collecting it before completing this visit.";
  return "";
};
module.exports = { servicePaymentSummary, servicePaymentBlocker };
