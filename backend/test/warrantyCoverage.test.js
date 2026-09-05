const test = require('node:test');
const assert = require('node:assert/strict');
const { buildActivatedWarranty, getWarrantyCoverage, warrantyApprovalError, ADVERTISED_POLICY } = require('../src/domain/warrantyService');

test('new installations match the advertised one-year parts and five-year compressor coverage', () => {
  const warranty = buildActivatedWarranty({}, '2024-02-29T10:00:00.000Z');
  assert.equal(warranty.policyVersion, ADVERTISED_POLICY);
  assert.equal(new Date(warranty.partsExpirationDate).toISOString(), '2025-02-28T10:00:00.000Z');
  assert.equal(new Date(warranty.compressorExpirationDate).toISOString(), '2029-02-28T10:00:00.000Z');
  assert.equal(warranty.coveredComponents.includes('Labor'), false);
  const coverage = getWarrantyCoverage(warranty, new Date('2026-09-06T00:00:00Z'));
  assert.equal(coverage.componentCoverage[0].status, 'expired');
  assert.equal(coverage.componentCoverage[1].status, 'active');
});

test('existing contracts are not silently converted to a new warranty policy', () => {
  const existing = { startDate: '2024-01-01', expirationDate: '2027-01-01', durationMonths: 36, coveredComponents: ['Contract-specific component'] };
  const warranty = buildActivatedWarranty(existing, '2024-01-01');
  assert.equal(warranty.policyVersion, undefined);
  assert.equal(warranty.durationMonths, 36);
  assert.deepEqual(warranty.coveredComponents, existing.coveredComponents);
  assert.match(getWarrantyCoverage(warranty).coverageSummary, /confirm component-specific coverage/);
});

test('repeat activation preserves component dates and does not extend coverage', () => {
  const first = buildActivatedWarranty({}, '2024-01-01');
  const next = buildActivatedWarranty(first, '2026-01-01');
  assert.deepEqual(next.partsExpirationDate, first.partsExpirationDate);
  assert.deepEqual(next.compressorExpirationDate, first.compressorExpirationDate);
});

test('five-year compressor coverage cannot approve an expired parts repair', () => {
  const warranty = buildActivatedWarranty({}, '2024-01-01');
  const now = new Date('2026-09-06T00:00:00Z');
  assert.match(warrantyApprovalError(warranty, 'parts', now), /Parts coverage is expired/);
  assert.equal(warrantyApprovalError(warranty, 'compressor', now), '');
  assert.match(warrantyApprovalError(warranty, '', now), /Select the covered component/);
});

test('pending or invalid component records never imply active coverage', () => {
  const warranty = buildActivatedWarranty({}, '2024-01-01');
  const now = new Date('2024-06-01T00:00:00Z');
  assert.equal(getWarrantyCoverage({ ...warranty, status: 'pending_activation' }, now).componentCoverage[0].status, 'pending_activation');
  assert.equal(getWarrantyCoverage({ ...warranty, partsExpirationDate: 'not-a-date' }, now).componentCoverage[0].status, 'pending_activation');
  assert.equal(getWarrantyCoverage({ ...warranty, status: 'void' }, now).componentCoverage[1].status, 'void');
});
