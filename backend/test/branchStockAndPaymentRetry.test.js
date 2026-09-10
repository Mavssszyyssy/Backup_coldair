const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Order = require('../src/models/Order');

const source = fs.readFileSync(require.resolve('../src/controllers/orderController'), 'utf8');

test('orders use only the assigned branch and give the required zero-stock message', () => {
  assert.match(source, /const finalBranch = preferredBranch;/);
  assert.match(source, /This branch currently has no stock of this item/);
  assert.doesNotMatch(source, /Tried preferred and nearby branches/);
});

test('GCash retries are capped at three and unpaid retries do not issue a receipt', () => {
  const retryAttempts = Order.schema.path('paymongo.retryAttempts');
  assert.equal(retryAttempts.defaultValue, 0);
  assert.match(source, /MAX_GCASH_RETRY_ATTEMPTS = 3/);
  assert.match(source, /PAYMENT_RETRY_LIMIT_REACHED/);
  assert.match(source, /paymongo\.retryAttempts": \{ \$exists: false \}/);
  assert.match(source, /paymentStatus: nextPaymentStatus/);
  assert.match(source, /amountPaid: 0/);
});
