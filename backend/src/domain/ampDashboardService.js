const Unit = require("../models/Unit");
const ServiceHistory = require("../models/ServiceHistory");
const { summarizeMajorComponentUse } = require("./ampComponentCategories");
const { normalizeServiceType } = require("./ampMaintenanceService");
const { BRANCHES } = require("./branchRouting");

const MS_PER_DAY = 86400000;
const DEFAULT_AVERAGE_SERVICE_REVENUE = 2500;
const UNASSIGNED_BRANCH = "Unassigned";
const REVENUE_DISCLAIMER = "Scenario revenue is calculated from upcoming recommended maintenance dates multiplied by the assumed average service value; it is not booked or confirmed revenue.";
const boundedNumber = (value, { fallback, min, max, integer = false, label }) => {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max || (integer && !Number.isInteger(numeric))) {
    const error = new Error(`${label} must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`);
    error.status = 400;
    throw error;
  }
  return numeric;
};
const addDays = (date, days) => new Date(date.getTime() + Number(days || 0) * MS_PER_DAY);
const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const addMonths = (date, months) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const monthLabel = (date) => date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const daysBetween = (from, to) => Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
const branchFilterMatch = (branch = "") => {
  if (!branch) return {};
  if (branch === UNASSIGNED_BRANCH) {
    return {
      $or: [
        { serviceBranch: { $exists: false } },
        { serviceBranch: null },
        { serviceBranch: "" },
        { serviceBranch: UNASSIGNED_BRANCH },
      ],
    };
  }
  return { serviceBranch: branch };
};

const buildRecordedMaintenanceTrends = async ({ branch = "" } = {}) => {
  const units = await Unit.find({
    status: { $ne: "retired" },
    ...branchFilterMatch(branch),
  }).select("brand modelName serviceBranch amp.recommendedService").limit(1000).lean();
  const unitIds = units.map((unit) => unit._id);
  const histories = unitIds.length
    ? await ServiceHistory.find({ unit: { $in: unitIds } }).select("unit partsUsed serviceDate serviceType visitType actionTaken serviceActions").sort({ serviceDate: -1 }).limit(5000).lean()
    : [];
  const maintenanceHistories = histories.filter((history) => ["regular_cleaning", "deep_cleaning"].includes(normalizeServiceType(history)));
  const unitMap = new Map(units.map((unit) => [String(unit._id), unit]));
  const modelMap = new Map(); const brandMap = new Map(); const serviceMap = new Map();
  units.forEach((unit) => {
    const serviceType = unit.amp?.recommendedService || "regular_cleaning";
    serviceMap.set(serviceType, (serviceMap.get(serviceType) || 0) + 1);
  });
  maintenanceHistories.forEach((history) => {
    const unit = unitMap.get(String(history.unit));
    if (!unit) return;
    const model = [unit.brand, unit.modelName].filter(Boolean).join(" ") || "Unspecified model";
    const brand = unit.brand || "Unspecified brand";
    const modelRow = modelMap.get(model) || { label: model, serviceCount: 0, units: new Set() };
    modelRow.serviceCount += 1; modelRow.units.add(String(history.unit)); modelMap.set(model, modelRow);
    const brandRow = brandMap.get(brand) || { label: brand, serviceCount: 0, units: new Set() };
    brandRow.serviceCount += 1; brandRow.units.add(String(history.unit)); brandMap.set(brand, brandRow);
  });
  const finish = (map) => Array.from(map.values()).map((item) => ({
    label: item.label, recordedServices: item.serviceCount, servicedUnits: item.units.size,
    servicesPerUnit: Number((item.serviceCount / Math.max(1, item.units.size)).toFixed(2)),
  })).sort((a, b) => b.servicesPerUnit - a.servicesPerUnit || b.recordedServices - a.recordedServices).slice(0, 10);
  return {
    modelTrends: finish(modelMap), brandTrends: finish(brandMap),
    componentReplacements: summarizeMajorComponentUse(histories),
    serviceDemand: Array.from(serviceMap.entries()).map(([serviceType, count]) => ({ serviceType, count })).sort((a, b) => b.count - a.count),
  };
};

const getManagerServicePipeline = async ({ days = 30, branch = "", includeAllBranches = false } = {}) => {
  const windowDays = boundedNumber(days, { fallback: 30, min: 1, max: 365, integer: true, label: "Pipeline window" });
  const now = new Date();
  const windowEnd = addDays(now, windowDays);
  const baseMatch = {
    status: { $in: ["active", "service_due"] },
    "amp.bestServicedBy": { $lte: windowEnd },
  };
  const unitMatch = { ...baseMatch, ...branchFilterMatch(branch) };
  const summaryMatch = {
    ...baseMatch,
    ...(!includeAllBranches ? branchFilterMatch(branch) : {}),
  };
  const [units, aggregate, recordedBranchSummary] = await Promise.all([Unit.aggregate([
    { $match: unitMatch },
    { $lookup: { from: "servicehistories", let: { unitId: "$_id" }, pipeline: [
      { $match: { $expr: { $eq: ["$unit", "$$unitId"] } } }, { $sort: { serviceDate: -1 } }, { $limit: 1 },
      { $project: { serviceDate: 1, serviceType: 1, visitType: 1, findings: 1, actionTaken: 1, partsUsed: 1 } },
    ], as: "lastVisit" } },
    { $addFields: { lastVisit: { $first: "$lastVisit" } } },
    { $sort: { "amp.bestServicedBy": 1 } }, { $limit: 200 },
  ]), buildRecordedMaintenanceTrends({ branch }), Unit.aggregate([
    { $match: summaryMatch },
    { $group: {
      _id: {
        $let: {
          vars: { branch: { $trim: { input: { $ifNull: ["$serviceBranch", ""] } } } },
          in: { $cond: [{ $eq: ["$$branch", ""] }, UNASSIGNED_BRANCH, "$$branch"] },
        },
      },
      total: { $sum: 1 },
      overdue: { $sum: { $cond: [{ $lt: ["$amp.bestServicedBy", now] }, 1, 0] } },
      upcoming: { $sum: { $cond: [{ $gte: ["$amp.bestServicedBy", now] }, 1, 0] } },
    } },
    { $sort: { _id: 1 } },
  ])]);
  const summaryByBranch = new Map(recordedBranchSummary.map((item) => [item._id, item]));
  const visibleBranches = includeAllBranches
    ? [...BRANCHES, UNASSIGNED_BRANCH]
    : [branch || UNASSIGNED_BRANCH];
  const branchSummary = visibleBranches.map((branchName) => {
    const item = summaryByBranch.get(branchName) || {};
    return {
      branch: branchName,
      total: Number(item.total || 0),
      overdue: Number(item.overdue || 0),
      upcoming: Number(item.upcoming || 0),
    };
  });
  return {
    generatedAt: new Date().toISOString(), windowDays, aggregate, branchSummary,
    units: units.map((unit) => {
      const dueDate = new Date(unit.amp.bestServicedBy);
      return {
        unitId: String(unit._id), serialNumber: unit.serialNumber, customerName: unit.customerName || "Customer",
        modelName: [unit.brand, unit.modelName].filter(Boolean).join(" ") || "AC Unit", serviceBranch: unit.serviceBranch || "",
        zipCode: unit.installation?.zipCode || "", addressLine: unit.installation?.addressLine || "",
        bestServicedBy: dueDate.toISOString(), recommendedService: unit.amp.recommendedService || "regular_cleaning",
        recommendationBasis: unit.amp.recommendationBasis || "", daysUntilDue: daysBetween(now, dueDate),
        overdue: dueDate < now, lastServiceDate: unit.lastVisit?.serviceDate || null,
        warrantyStatus: unit.warranty?.status || "pending_activation",
        capacityAssessment: unit.amp.capacityAssessment || null,
      };
    }),
  };
};

const getOwnerServiceForecast = async ({ months = 12, averageRevenue } = {}) => {
  const forecastMonths = boundedNumber(months, { fallback: 12, min: 1, max: 24, integer: true, label: "Forecast months" });
  const serviceRevenue = boundedNumber(averageRevenue, { fallback: DEFAULT_AVERAGE_SERVICE_REVENUE, min: 1, max: 1000000, label: "Assumed service value" });
  const now = new Date(); const firstMonth = startOfMonth(now); const afterLastMonth = addMonths(firstMonth, forecastMonths);
  const [buckets, serviceTypes, componentRows, branchRows, recordedTrends] = await Promise.all([
    Unit.aggregate([
      { $match: { status: { $in: ["active", "service_due"] }, "amp.bestServicedBy": { $gte: firstMonth, $lt: afterLastMonth } } },
      { $group: { _id: { year: { $year: "$amp.bestServicedBy" }, month: { $month: "$amp.bestServicedBy" } }, serviceVolume: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Unit.aggregate([
      { $match: { status: { $in: ["active", "service_due"] } } },
      { $group: { _id: { $ifNull: ["$amp.recommendedService", "regular_cleaning"] }, count: { $sum: 1 } } },
    ]),
    ServiceHistory.find({ partsUsed: { $exists: true, $ne: [] } }).select("partsUsed serviceDate").sort({ serviceDate: -1 }).limit(2000).lean(),
    Unit.aggregate([
      { $match: { status: { $in: ["active", "service_due"] }, "amp.bestServicedBy": { $gte: firstMonth, $lt: afterLastMonth } } },
      { $group: {
        _id: {
          $let: {
            vars: { branch: { $trim: { input: { $ifNull: ["$serviceBranch", ""] } } } },
            in: { $cond: [{ $eq: ["$$branch", ""] }, "Unassigned", "$$branch"] },
          },
        },
        upcomingServices: { $sum: 1 },
      } },
      { $sort: { upcomingServices: -1 } },
    ]),
    buildRecordedMaintenanceTrends(),
  ]);
  const bucketMap = new Map(buckets.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, "0")}`, item.serviceVolume]));
  const forecast = Array.from({ length: forecastMonths }, (_unused, index) => {
    const date = addMonths(firstMonth, index); const volume = bucketMap.get(monthKey(date)) || 0;
    return { month: monthKey(date), label: monthLabel(date), serviceVolume: volume, projectedRevenue: volume * serviceRevenue };
  });
  const parts = summarizeMajorComponentUse(componentRows);
  return {
    generatedAt: new Date().toISOString(), months: forecastMonths, averageServiceRevenue: serviceRevenue,
    revenueBasis: "scenario_estimate", revenueDisclaimer: REVENUE_DISCLAIMER,
    totalForecastedServices: forecast.reduce((sum, item) => sum + item.serviceVolume, 0),
    totalProjectedRevenue: forecast.reduce((sum, item) => sum + item.projectedRevenue, 0), forecast,
    recommendedServiceDemand: serviceTypes.map((item) => ({ serviceType: item._id, count: item.count })),
    recordedPartsTrend: parts,
    branchMaintenanceVolume: branchRows.map((item) => ({ branch: item._id, upcomingServices: item.upcomingServices })),
    modelTrends: recordedTrends.modelTrends,
    brandTrends: recordedTrends.brandTrends,
  };
};

module.exports = { boundedNumber, branchFilterMatch, getManagerServicePipeline, getOwnerServiceForecast, UNASSIGNED_BRANCH };
