const test = require("node:test");
const assert = require("node:assert/strict");
const Unit = require("../src/models/Unit");
const History = require("../src/models/ServiceHistory");
const { serviceTypeFor, assessServiceEvidence } = require("../src/domain/serviceEvidence");
const { intervalSamplesForUnits, calculateMaintenanceRecommendation, cleaningMethodForDates } = require("../src/domain/ampMaintenanceService");
const { validateStrictServicePayload } = require("../src/domain/serviceCompletionService");
const { effectiveWarrantyStatus, buildActivatedWarranty } = require("../src/domain/warrantyService");
const { parseInstallationDateTime, businessDay } = require("../src/utils/dateTime");
const { maintenanceAlertForRecommendation } = require("../src/services/ampDailyMonitorService");

const finding = { serviceType: "regular_cleaning", findings: "Visible dust buildup on the evaporator coil.", actionTaken: "Cleaned the coil and flushed the drain.", conditionRating: "good" };
test("legacy installation and repair visits cannot be relabeled as cleaning", () => {
  for (const visitType of ["installation", "inspection", "repair"]) assert.equal(serviceTypeFor({ visitType, serviceType: "regular_cleaning" }), visitType);
  assert.equal(serviceTypeFor({ visitType: "scheduled_service", actionTaken: "Service completed" }), "unknown");
});
test("the screenshot's recommendation-only record is not evidence of cleaning", () => {
  const history = { ...finding, serviceDate: "2026-09-05", findings: "AMP recommended regular cleaning for this AC unit.", actionTaken: "Service completed" };
  assert.equal(assessServiceEvidence(history, { asOfDate: "2026-09-06" }).eligible, false);
  assert.equal(validateStrictServicePayload(history).ok, false);
});
test("future and pre-installation service dates are excluded", () => {
  assert.equal(assessServiceEvidence({ ...finding, serviceDate: "2027-01-01" }, { asOfDate: "2026-09-05" }).eligible, false);
  assert.equal(assessServiceEvidence({ ...finding, serviceDate: "2026-09-05T13:00:00Z" }, { asOfDate: "2026-09-05T12:00:00Z" }).eligible, false);
  assert.equal(assessServiceEvidence({ ...finding, serviceDate: "2026-01-01" }, { asOfDate: "2026-09-05", installedAt: "2026-02-01" }).eligible, false);
  assert.equal(validateStrictServicePayload({ ...finding, serviceDate: "2099-01-01", serviceActions: [finding.actionTaken] }).ok, false);
});
test("My Units preserves the Philippine installation day instead of the preceding UTC date", () => {
  const { serializeCustomerUnit } = require("../src/controllers/ampController");
  const result = serializeCustomerUnit({ _id: "unit", installation: { installedAt: "2026-09-05T16:00:00Z" } });
  assert.equal(result.installationDate, "2026-09-06");
});
test("cohort intervals use actual cleaning evidence and ignore duplicate days and repairs", () => {
  const units = [{ _id: "a", installation: { installedAt: "2025-01-01" } }];
  const histories = [
    { ...finding, unit: "a", serviceDate: "2025-04-01" },
    { ...finding, unit: "a", serviceDate: "2025-04-01T01:00:00Z" },
    { ...finding, unit: "a", serviceDate: "2025-05-01", serviceType: "repair" },
    { ...finding, unit: "a", serviceDate: "2025-06-30" },
    { ...finding, unit: "a", serviceDate: "2026-12-31" },
  ];
  assert.deepEqual(intervalSamplesForUnits(units, histories, "2026-09-05"), [90, 90]);
});
test("Philippine form dates and maintenance days do not depend on server timezone", () => {
  assert.equal(parseInstallationDateTime("2026-09-05", "16:14").toISOString(), "2026-09-05T08:14:00.000Z");
  assert.equal(parseInstallationDateTime("2026-02-30", "12:00"), null);
  assert.equal(businessDay("2026-09-05T16:30:00Z").toISOString(), "2026-09-06T00:00:00.000Z");
  const alert = maintenanceAlertForRecommendation({ bestServicedBy: "2026-09-06", recommendedService: "regular_cleaning" }, new Date("2026-09-06T10:00:00Z"));
  assert.equal(alert.daysUntilDue, 0);
  assert.notEqual(alert.tier, "amp_overdue");
});
test("missing history does not invent a cleaning method or active warranty", () => {
  assert.equal(cleaningMethodForDates({ asOfDate: "2026-09-05" }), "");
  assert.equal(effectiveWarrantyStatus({}), "pending_activation");
  assert.equal(effectiveWarrantyStatus({ status: "active" }), "pending_activation");
  assert.equal(buildActivatedWarranty({ status: "pending_activation" }, "2026-01-01").status, "active");
  assert.equal(buildActivatedWarranty({ status: "void" }, "2026-01-01").status, "void");
});
test("recalculation preserves hold/retired status and does not invent missing dates", async (t) => {
  const chain = (rows) => ({ select() { return this; }, sort() { return this; }, lean: async () => rows });
  let fixture;
  t.mock.method(Unit, "findById", async () => fixture);
  t.mock.method(Unit, "find", () => chain([]));
  t.mock.method(History, "find", () => chain([]));
  for (const status of ["on_hold", "retired", "active"]) {
    fixture = { _id: "fixture", brand: "LG", modelName: "Test", category: "split", status, amp: {}, installation: {}, save: async () => {} };
    const result = await calculateMaintenanceRecommendation("fixture", { asOfDate: "2026-09-05" });
    assert.equal(result.bestServicedBy, null);
    assert.equal(result.recommendedService, "");
    assert.equal(fixture.status, status);
    assert.equal(result.dataQuality.anchorType, "missing");
  }
});
test("a repair does not move the cleaning anchor and an incomplete record stays visible in quality counts", async (t) => {
  const fixture = { _id: "fixture", brand: "LG", modelName: "Test", category: "split", status: "on_hold", amp: {}, installation: { installedAt: "2025-01-01" }, save: async () => {} };
  const rows = [
    { ...finding, serviceType: "repair", serviceDate: "2026-09-01" },
    { ...finding, serviceDate: "2026-08-01", findings: "AMP recommended regular cleaning for this AC unit.", actionTaken: "Service completed" },
    { ...finding, serviceDate: "2026-01-01" },
  ];
  const chain = (items) => ({ select() { return this; }, sort() { return this; }, lean: async () => items });
  t.mock.method(Unit, "findById", async () => fixture);
  t.mock.method(Unit, "find", () => chain([]));
  t.mock.method(History, "find", () => chain(rows));
  const result = await calculateMaintenanceRecommendation("fixture", { asOfDate: "2026-09-05" });
  assert.equal(result.lastCleaningDate, "2026-01-01T00:00:00.000Z");
  assert.equal(result.lastServiceDate, "2026-09-01T00:00:00.000Z");
  assert.equal(result.bestServicedBy, "2026-09-28T00:00:00.000Z");
  assert.equal(result.dataQuality.excludedRecordCount, 1);
  assert.equal(fixture.status, "on_hold");
  assert.match(result.recommendationBasis, /configured 270-day/);
});
test("equal horsepower in a different category is brand evidence, not same-type evidence", async (t) => {
  const unit = { _id: "target", brand: "LG", modelName: "Split A", category: "split", capacityHp: 1, installation: { installedAt: "2026-06-01" } };
  const other = { _id: "other", brand: "LG", modelName: "Window B", category: "window", capacityHp: 1, installation: { installedAt: "2025-01-01" } };
  const rows = ["2025-04-01", "2025-07-01"].map((serviceDate) => ({ ...finding, unit: "other", serviceDate }));
  const chain = (items) => ({ select() { return this; }, sort() { return this; }, lean: async () => items });
  t.mock.method(Unit, "findById", async () => unit);
  t.mock.method(Unit, "find", () => chain([unit, other]));
  t.mock.method(History, "find", (query) => chain(query.unit === "target" ? [] : rows));
  const brandOnly = await calculateMaintenanceRecommendation("target", { asOfDate: "2026-09-05", persist: false });
  assert.equal(brandOnly.historicalBasis.level, "same_brand");
  other.category = "split";
  const sameType = await calculateMaintenanceRecommendation("target", { asOfDate: "2026-09-05", persist: false });
  assert.equal(sameType.historicalBasis.level, "same_brand_type");
});
