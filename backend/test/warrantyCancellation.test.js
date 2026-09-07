const test = require('node:test');
const assert = require('node:assert/strict');
const Unit = require('../src/models/Unit');
const ServiceRequest = require('../src/models/ServiceRequest');
const { cancelWarrantyForRequest, reconcileCancelledWarranty } = require('../src/domain/warrantyCancellation');

test('cancellation targets only the matching approved claim, without altering coverage', async (t) => {
  const update = t.mock.method(Unit, 'updateOne', async () => ({ modifiedCount: 1 }));
  await cancelWarrantyForRequest({ _id: 'request-1', unitId: 'unit-1', status: 'Cancelled', payload: { warrantyClaimId: 'claim-1' } }, 'Customer cancelled');
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter['warranty.claims'].$elemMatch, { claimId: 'claim-1', serviceRequestId: 'request-1', status: 'approved' });
  assert.equal(change.$set['warranty.claims.$.status'], 'cancelled');
  assert.equal(change.$set['warranty.claims.$.cancellationReason'], 'Customer cancelled');
  assert.equal(Object.keys(change.$set).some(key => /start|expiry|componentCoverage/.test(key)), false);
});

test('non-warranty requests and non-cancelled work never close claims', async (t) => {
  const update = t.mock.method(Unit, 'updateOne', async () => ({}));
  await cancelWarrantyForRequest({ unitId: 'unit-1', status: 'Cancelled', payload: {} });
  await cancelWarrantyForRequest({ unitId: 'unit-1', status: 'Completed', payload: { warrantyClaimId: 'claim-1' } });
  assert.equal(update.mock.callCount(), 0);
});

test('legacy cancelled work reconciles approved claims, ignoring invalid old IDs', async (t) => {
  const id = '6a9bcf84c76ac059d175d7ac';
  const unit = { _id: 'unit-1', warranty: { claims: [{ status: 'approved', serviceRequestId: id }, { status: 'approved', serviceRequestId: 'legacy-label' }] } };
  const find = t.mock.method(ServiceRequest, 'find', async () => [{ _id: id, unitId: 'unit-1', status: 'Cancelled', payload: { warrantyClaimId: 'claim-1' } }]);
  t.mock.method(Unit, 'updateOne', async () => ({}));
  const refreshed = { ...unit, reconciled: true };
  t.mock.method(Unit, 'findById', async () => refreshed);
  assert.equal(await reconcileCancelledWarranty(unit), refreshed);
  assert.deepEqual(find.mock.calls[0].arguments[0]._id.$in, [id]);
});
