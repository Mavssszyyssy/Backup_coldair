const MAX_GCASH_PAYMENT_ATTEMPTS = 3;
const GCASH_PAYMENT_LIMIT_MESSAGE =
  "Maximum payment attempts reached. You can no longer retry payment for this order.";

const storedGcashPaymentAttemptCount = (order = {}) =>
  Math.max(0, Number(order?.paymongo?.retryAttempts || 0));

// Older orders stored only retries and left the first checkout at zero. The
// linked original session proves that one payment attempt already occurred.
const gcashPaymentAttemptCount = (order = {}) => {
  const stored = storedGcashPaymentAttemptCount(order);
  if (stored > 0) return stored;
  return String(order?.paymongo?.checkoutSessionId || "").trim() ? 1 : 0;
};

const gcashPaymentAttemptsRemaining = (order = {}) =>
  Math.max(0, MAX_GCASH_PAYMENT_ATTEMPTS - gcashPaymentAttemptCount(order));

const gcashRetryLimitReached = (order = {}) =>
  gcashPaymentAttemptCount(order) >= MAX_GCASH_PAYMENT_ATTEMPTS;

const gcashRetryableStatus = (status = "") =>
  ["pending", "failed", "cancelled", "expired"].includes(
    String(status || "").trim().toLowerCase(),
  );

module.exports = {
  MAX_GCASH_PAYMENT_ATTEMPTS,
  GCASH_PAYMENT_LIMIT_MESSAGE,
  storedGcashPaymentAttemptCount,
  gcashPaymentAttemptCount,
  gcashPaymentAttemptsRemaining,
  gcashRetryLimitReached,
  gcashRetryableStatus,
};
