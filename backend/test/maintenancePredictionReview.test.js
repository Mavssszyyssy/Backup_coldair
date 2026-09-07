const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPredictionSnapshot, comparePredictionHistory } = require("../src/domain/maintenancePredictionReview");

const unit = { _id: "64fa00000000000000000001", installation: { installedAt: "2025-01-01T00:00:00.000Z" } };
const recommendation = {
  bestServicedBy: "2026-06-30T00:00:00.000Z", recommendedService: "regular_cleaning",
  recommendationBasis: "Based on completed services for the same model.",
  historicalBasis: { level: "same_model", sampleSize: 4, comparableUnitCount: 3, intervalDays: 180 },
  dataQuality: { excludedRecordCount: 1 },
};
const completedCleaning = (serviceDate, overrides = {}) => ({
  _id: `history-${serviceDate}`, serviceDate, serviceType: "regular_cleaning",
  findings: "Dust buildup was found on the evaporator coil.",
  actionTaken: "Cleaned the evaporator coil and flushed the drain line.",
  ...overrides,
});

test("identical recommendations share an immutable snapshot ID while a changed schedule creates a new plan", () => {
  const first = buildPredictionSnapshot(unit, recommendation, new Date("2026-01-10T08:00:00Z"));
  const repeat = buildPredictionSnapshot(unit, recommendation, new Date("2026-01-11T08:00:00Z"));
  const changed = buildPredictionSnapshot(unit, { ...recommendation, bestServicedBy: "2026-07-30T00:00:00.000Z" }, new Date("2026-01-12T08:00:00Z"));
  assert.equal(first._id, repeat._id);
  assert.notEqual(first._id, changed._id);
  assert.equal(first.sampleSize, 4);
  assert.equal(first.excludedRecordCount, 1);
});

test("only a plan captured before a documented cleaning is available for outcome review", () => {
  const plan = buildPredictionSnapshot(unit, recommendation, new Date("2026-01-10T08:00:00Z"));
  const laterPlan = buildPredictionSnapshot(unit, { ...recommendation, bestServicedBy: "2026-11-30T00:00:00.000Z" }, new Date("2026-08-01T08:00:00Z"));
  const result = comparePredictionHistory([plan, laterPlan], [
    completedCleaning("2026-07-03T09:30:00Z"),
    completedCleaning("2026-09-01T09:30:00Z", { findings: "General cleaning was completed with no major defects." }),
  ], { installedAt: unit.installation.installedAt, asOfDate: "2026-10-01" });
  const [newest, older] = result;
  assert.equal(older.status, "ready_for_review");
  assert.equal(older.outcome.serviceLabel, "Regular cleaning");
  assert.equal(older.outcome.daysFromSuggestedDate, 3);
  assert.equal(newest.status, "ready_for_review");
  assert.equal(newest.outcome.daysFromSuggestedDate, -90);
});

test("a plan created after the visit, incomplete work, and a missing service date are never matched", () => {
  const afterVisit = buildPredictionSnapshot(unit, recommendation, new Date("2026-07-10T08:00:00Z"));
  const plans = comparePredictionHistory([afterVisit], [
    completedCleaning("2026-07-03T09:30:00Z"),
    completedCleaning("2026-08-01T09:30:00Z", { findings: "AMP recommended regular cleaning.", actionTaken: "Service completed" }),
  ], { installedAt: unit.installation.installedAt, asOfDate: "2026-10-01" });
  assert.equal(plans[0].status, "awaiting_visit");
  assert.equal(plans[0].outcome, null);
});
