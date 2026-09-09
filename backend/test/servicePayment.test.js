const test = require('node:test');
const assert = require('node:assert/strict');
const { servicePaymentSummary: summary, servicePaymentBlocker: blocker } = require('../src/domain/servicePayment');
const { normalizePaymentMethods } = require('../src/services/paymongoClient');
const request = amount => ({ payload: { pricing: { basePrice: amount } } });
test('missing price is not zero or paid', () => {
  for (const amount of [undefined, null, '', -1, NaN]) assert.equal(summary(request(amount)).status, 'quote_required');
  assert.match(blocker(request(null)), /Admin/);
});
test('configured price, free quote, and approved warranty stay distinct', () => {
  assert.equal(summary(request(800)).amount, 800);
  assert.equal(summary(request(800)).status, 'due');
  assert.equal(summary(request(0)).status, 'no_charge');
  assert.equal(summary({ payload: { warrantyClaimId: 'approved-claim' } }).status, 'warranty_covered');
  assert.equal(blocker({ payload: { warrantyClaimId: 'approved-claim' } }), '');
});
test('admin quote overrides catalog and collection is auditable', () => {
  const r = { ...request(700), servicePayment: { amount: 800, quoteId: 'q1' } };
  assert.equal(summary(r).amount, 800);
  assert.match(blocker(r), /cash payment/);
  r.servicePayment.collectedAt = '2026-09-09T01:00:00Z';
  r.servicePayment.collectedBy = 'assigned-tech';
  assert.equal(summary(r).status, 'paid');
  assert.equal(summary(r).collectedBy, 'assigned-tech');
  assert.equal(blocker(r), '');
});
test('selected online method restricts hosted checkout to that method', () => {
  assert.deepEqual(normalizePaymentMethods('gcash'), ['gcash']);
  assert.deepEqual(normalizePaymentMethods('card'), ['card']);
  assert.deepEqual(normalizePaymentMethods('credit'), ['card']);
  assert.deepEqual(normalizePaymentMethods('maya'), ['paymaya']);
});
