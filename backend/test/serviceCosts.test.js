const test = require('node:test');
const assert = require('node:assert/strict');
const { serviceCosts, validateServiceCosts } = require('../src/domain/serviceCosts');
test('unrecorded costs are distinct from confirmed zero and a customer fee', () => {
  assert.equal(serviceCosts({ servicePayment: { amount: 800 } }).totalServiceCost, null);
  assert.equal(serviceCosts({ laborCost: 0, partsCost: 0 }).totalServiceCost, 0);
  assert.equal(serviceCosts({ laborCost: 250.5, partsCost: 99.5 }).totalServiceCost, 350);
});
test('costs reject invalid money and derive totals from notes, including edits and removal', () => {
  for (const bad of [-1, 'abc', true, ' ', 1.111, Infinity, 1000001]) assert.ok(validateServiceCosts({ laborCost: bad }));
  const payload = { serviceLogs: [{ laborCost: '200', partsCost: 50 }, { laborCost: 100, partsCost: 0 }], totalServiceCost: 9999 };
  assert.equal(validateServiceCosts(payload), '');
  assert.equal(payload.laborCost, 300);
  assert.equal(payload.partsCost, 50);
  assert.equal(serviceCosts(payload).totalServiceCost, 350);
  assert.equal(payload.totalServiceCost, undefined);
  assert.ok(validateServiceCosts({ serviceLogs: [{ partsCost: -5 }] }));
  const removed = { serviceLogs: [] };
  validateServiceCosts(removed);
  assert.equal(serviceCosts(removed).totalServiceCost, null);
});
