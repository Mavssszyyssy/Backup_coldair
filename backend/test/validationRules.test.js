const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePostalCodeForAddress } = require("../src/utils/postalCodeValidation");
const { getScheduledDateError } = require("../src/utils/scheduling");
const { validateStrictServicePayload } = require("../src/domain/serviceCompletionService");

test("postal codes must match the selected city", () => {
  const address = { region: "CALABARZON", province: "Cavite", city: "Bacoor" };
  assert.equal(validatePostalCodeForAddress({ ...address, postalCode: "4102" }), "");
  assert.match(validatePostalCodeForAddress({ ...address, postalCode: "1000" }), /does not match/i);
  assert.match(validatePostalCodeForAddress({ ...address, postalCode: "410" }), /exactly 4 digits/i);
});

test("service dates reject invalid and past calendar dates", () => {
  assert.match(getScheduledDateError("2026-02-30"), /valid calendar date/i);
  assert.match(getScheduledDateError("2020-01-01"), /cannot be in the past/i);
  assert.equal(getScheduledDateError("2099-12-31"), "");
});

test("technician service completion requires real report details", () => {
  const empty = validateStrictServicePayload({});
  assert.equal(empty.ok, false);
  assert.deepEqual(Object.keys(empty.errors).sort(), [
    "conditionRating",
    "findings",
    "serviceActions",
    "serviceType",
  ]);

  const valid = validateStrictServicePayload({
    serviceType: "deep_cleaning",
    findings: "Evaporator coil had heavy dust buildup.",
    serviceActions: ["Cleaned evaporator coil", "Flushed drain line"],
    conditionRating: "fair",
    serviceDate: "2099-01-15",
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.values.serviceType, "deep_cleaning");
});
