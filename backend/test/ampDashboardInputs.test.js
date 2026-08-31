const test = require("node:test");
const assert = require("node:assert/strict");
const { boundedNumber } = require("../src/domain/ampDashboardService");

test("AMP dashboard query ranges reject abusive or misleading values", () => {
  const options = { fallback: 12, min: 1, max: 24, integer: true, label: "Forecast months" };
  assert.equal(boundedNumber(undefined, options), 12);
  assert.equal(boundedNumber("6", options), 6);
  assert.throws(() => boundedNumber("100000000", options), /1 to 24/);
  assert.throws(() => boundedNumber("-2", options), /1 to 24/);
  assert.throws(() => boundedNumber("1.5", options), /whole number/);
  assert.throws(() => boundedNumber("not-a-number", options), /1 to 24/);
});
