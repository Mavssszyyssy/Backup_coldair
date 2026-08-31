const test = require("node:test");
const assert = require("node:assert/strict");
const { maintenanceAlertForRecommendation } = require("../src/services/ampDailyMonitorService");
const { isAuthorizedCronRequest } = require("../src/controllers/cronController");

const now = new Date("2026-08-31T00:00:00.000Z");
const recommendation = (date) => ({ bestServicedBy: date, recommendedService: "regular_cleaning" });

test("daily monitor classifies maintenance alert windows", () => {
  assert.equal(maintenanceAlertForRecommendation(recommendation("2026-10-15T00:00:00.000Z"), now), null);
  assert.equal(maintenanceAlertForRecommendation(recommendation("2026-09-20T00:00:00.000Z"), now).tier, "maintenance_due");
  assert.equal(maintenanceAlertForRecommendation(recommendation("2026-09-05T00:00:00.000Z"), now).tier, "amp_due_soon");
  assert.equal(maintenanceAlertForRecommendation(recommendation("2026-08-20T00:00:00.000Z"), now).tier, "amp_overdue");
});

test("cron authentication fails closed when the secret is absent or wrong", () => {
  assert.equal(isAuthorizedCronRequest("Bearer expected", ""), false);
  assert.equal(isAuthorizedCronRequest("Bearer wrong", "expected"), false);
  assert.equal(isAuthorizedCronRequest("Bearer expected", "expected"), true);
});
