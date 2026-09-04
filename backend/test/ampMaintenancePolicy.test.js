const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SERVICE_INTERVAL_DAYS,
  capacityAssessmentFor,
  cleaningMethodForDates,
  selectHistoricalCohort,
} = require("../src/domain/ampMaintenanceService");
const {
  canonicalMajorComponent,
  summarizeMajorComponentUse,
} = require("../src/domain/ampComponentCategories");

test("AMP selects aggregate intervals in model-to-brand priority order", () => {
  const sameModelUnits = [{ _id: "model-1" }, { _id: "model-2" }];
  const sameBrandUnits = [{ _id: "brand-1" }];
  const selected = selectHistoricalCohort([
    { level: "same_model", units: sameModelUnits, samples: [180, 240] },
    { level: "same_brand", units: sameBrandUnits, samples: [120, 150, 180] },
  ]);

  assert.equal(selected.level, "same_model");
  assert.equal(selected.intervalDays, 210);
  assert.equal(selected.sampleSize, 2);
  assert.deepEqual(selected.unitIds, ["model-1", "model-2"]);
});

test("AMP falls back to the standard interval when comparable history is insufficient", () => {
  const selected = selectHistoricalCohort([
    { level: "same_model", units: [{ _id: "model-1" }], samples: [200] },
    { level: "same_brand", units: [], samples: [] },
  ]);

  assert.equal(selected.level, "system_default");
  assert.equal(selected.intervalDays, DEFAULT_SERVICE_INTERVAL_DAYS);
  assert.equal(selected.sampleSize, 0);
});

test("cleaning method changes only after the one-year anniversary", () => {
  const reference = "2026-03-15T00:00:00.000Z";
  assert.equal(cleaningMethodForDates({ lastCleaningDate: reference, asOfDate: "2027-03-14" }), "regular_cleaning");
  assert.equal(cleaningMethodForDates({ lastCleaningDate: reference, asOfDate: "2027-03-15" }), "regular_cleaning");
  assert.equal(cleaningMethodForDates({ lastCleaningDate: reference, asOfDate: "2027-03-16" }), "deep_cleaning");
});

test("installation date becomes the cleaning reference when no cleaning exists", () => {
  assert.equal(cleaningMethodForDates({ installationDate: "2025-01-01", asOfDate: "2026-01-02" }), "deep_cleaning");
  assert.equal(cleaningMethodForDates({ installationDate: "2026-01-01", asOfDate: "2026-06-01" }), "regular_cleaning");
});

test("room size is assessed against recorded horsepower", () => {
  assert.equal(capacityAssessmentFor({ roomSizeSqm: null, capacityHp: 1.5 }).status, "room_size_required");
  assert.equal(capacityAssessmentFor({ roomSizeSqm: 21, capacityHp: 1.5 }).status, "suitable");
  assert.equal(capacityAssessmentFor({ roomSizeSqm: 35, capacityHp: 1 }).status, "insufficient");
});

test("inventory trends use only the two recognized major component groups", () => {
  assert.equal(canonicalMajorComponent("inverter PCB"), "Control Board");
  assert.equal(canonicalMajorComponent("compressor motor"), "Compressor / Motor");
  assert.equal(canonicalMajorComponent("air filter"), "");
  assert.deepEqual(summarizeMajorComponentUse([
    { partsUsed: ["Compressor", "Control board", "Filter"] },
    { partsUsed: ["Motor", "PCB"] },
  ]), [
    { component: "Compressor / Motor", count: 2 },
    { component: "Control Board", count: 2 },
  ]);
});
