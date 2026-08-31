const Unit = require("../models/Unit");
const { calculateMaintenanceRecommendation } = require("../domain/ampMaintenanceService");
const { createDedupedNotification, notifyOperationalStaff } = require("./operationalNotificationService");
const { formatDateKeyInTimeZone } = require("../utils/dateTime");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const displayService = (value) => value === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";

const maintenanceAlertForRecommendation = (recommendation, now = new Date()) => {
  const due = new Date(recommendation?.bestServicedBy || "");
  if (Number.isNaN(due.getTime())) return null;
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY);
  if (daysUntilDue > 30) return null;
  const dateKey = formatDateKeyInTimeZone(due);
  if (daysUntilDue < 0) return {
    tier: "amp_overdue", severity: "critical", title: "AC maintenance is overdue",
    message: `${displayService(recommendation.recommendedService)} was recommended by ${due.toLocaleDateString("en-US")}. Open My AC Units to review it.`, dateKey, daysUntilDue,
  };
  if (daysUntilDue <= 7) return {
    tier: "amp_due_soon", severity: "warning", title: "AC maintenance is due soon",
    message: `${displayService(recommendation.recommendedService)} is recommended by ${due.toLocaleDateString("en-US")}. Open My AC Units to plan your visit.`, dateKey, daysUntilDue,
  };
  return {
    tier: "maintenance_due", severity: "info", title: "Plan your next AC maintenance",
    message: `${displayService(recommendation.recommendedService)} is recommended by ${due.toLocaleDateString("en-US")}. Open My AC Units for the details.`, dateKey, daysUntilDue,
  };
};

const notifyMaintenanceForUnit = async (unit, recommendation, now = new Date()) => {
  if (!unit?.customer) return null;
  const alert = maintenanceAlertForRecommendation(recommendation, now);
  if (!alert) return null;
  return createDedupedNotification({
    user: unit.customer,
    type: "service",
    category: alert.tier,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    targetId: String(unit._id || unit.id || recommendation.unitId || ""),
    targetType: "unit",
    dedupeKey: `amp:${unit._id || unit.id}:${alert.tier}:${alert.dateKey}`,
  }, { dedupeMinutes: 0 });
};

const runAmpDailyMonitor = async ({ now = new Date(), limit = 500 } = {}) => {
  const horizon = new Date(now.getTime() + 30 * MS_PER_DAY);
  const units = await Unit.find({
    status: { $in: ["active", "service_due"] },
    customer: { $ne: null },
    $or: [
      { "amp.bestServicedBy": { $lte: horizon } },
      { "amp.bestServicedBy": null },
      { "amp.bestServicedBy": { $exists: false } },
    ],
  })
    .select("customer brand modelName serviceBranch status")
    .sort({ "amp.bestServicedBy": 1, _id: 1 })
    .limit(Math.min(Math.max(Number(limit) || 500, 1), 1000));
  const stats = { scanned: units.length, alertsCreated: 0, dueSoon: 0, overdue: 0, errors: 0 };
  const branchSummary = new Map();

  for (const unit of units) {
    try {
      const recommendation = await calculateMaintenanceRecommendation(unit._id, { asOfDate: now });
      const alert = maintenanceAlertForRecommendation(recommendation, now);
      if (!alert) continue;
      const notification = await notifyMaintenanceForUnit(unit, recommendation, now);
      if (notification && notification.$locals?.wasDeduplicated !== true) stats.alertsCreated += 1;
      if (alert.daysUntilDue < 0) stats.overdue += 1; else stats.dueSoon += 1;
      const branch = String(unit.serviceBranch || "Unassigned");
      const summary = branchSummary.get(branch) || { dueSoon: 0, overdue: 0 };
      if (alert.daysUntilDue < 0) summary.overdue += 1; else summary.dueSoon += 1;
      branchSummary.set(branch, summary);
    } catch (error) {
      stats.errors += 1;
      console.warn("AMP daily monitor skipped a unit", { unitId: String(unit._id), reason: error.message });
    }
  }

  const dateKey = formatDateKeyInTimeZone(now);
  for (const [branch, summary] of branchSummary) {
    await notifyOperationalStaff({
      branch: branch === "Unassigned" ? "" : branch,
      type: "service",
      category: "maintenance_pipeline",
      severity: summary.overdue ? "warning" : "info",
      title: "AMP maintenance pipeline updated",
      message: `${summary.overdue} overdue and ${summary.dueSoon} upcoming AC maintenance visit(s) are ready for review${branch === "Unassigned" ? "" : ` in ${branch}`}.`,
      targetType: "amp_pipeline",
      route: "/manager/amp",
      dedupeKey: `amp-pipeline:${branch}:${dateKey}`,
      dedupeMinutes: 0,
    });
  }

  return stats;
};

module.exports = { maintenanceAlertForRecommendation, notifyMaintenanceForUnit, runAmpDailyMonitor };
