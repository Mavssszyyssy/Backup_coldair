const test = require("node:test");
const assert = require("node:assert/strict");
const { assessEnvironmentRisk, normalizeEnvironmentProfile } = require("../src/domain/ampEnvironmentRisk");

test("neutral operating conditions preserve the historical maintenance interval", () => {
  const risk = assessEnvironmentRisk(normalizeEnvironmentProfile({ usageHoursPerDay: 8 }), 270);
  assert.equal(risk.level, "low");
  assert.equal(risk.adjustedIntervalDays, 270);
  assert.equal(risk.recorded, false);
});

test("recorded harsh conditions shorten but safely bound the maintenance interval", () => {
  const risk = assessEnvironmentRisk({
    placementType: "kitchen",
    usageHoursPerDay: 16,
    occupancyLevel: "high",
    dustExposure: "high",
    humidityExposure: "high",
    greaseSmokeExposure: "high",
    coastalExposure: true,
    directSunExposure: "high",
    filterCondition: "clogged",
    coilCondition: "dusty",
    drainageCondition: "blocked",
    voltageStability: "unstable",
    capturedAt: "2026-08-31T00:00:00.000Z",
  }, 270);
  assert.equal(risk.level, "severe");
  assert.equal(risk.recorded, true);
  assert.equal(risk.adjustedIntervalDays, 162);
  assert.ok(risk.reasons.includes("high dust exposure"));
});

test("invalid environment values are normalized to safe neutral defaults", () => {
  const profile = normalizeEnvironmentProfile({ usageHoursPerDay: 99, dustExposure: "invented" });
  assert.equal(profile.usageHoursPerDay, 24);
  assert.equal(profile.dustExposure, "normal");
});
