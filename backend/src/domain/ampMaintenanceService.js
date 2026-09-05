const mongoose = require("mongoose");
const Product = require("../models/Product");
const ServiceHistory = require("../models/ServiceHistory");
const Unit = require("../models/Unit");
const { serviceTypeFor, assessServiceEvidence } = require("./serviceEvidence");
const { businessDay } = require("../utils/dateTime");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SERVICE_INTERVAL_DAYS = 270;
const MIN_HISTORICAL_SAMPLES = 2;

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfUtcDay = (value = new Date()) => {
  return businessDay(value);
};

const addDays = (date, days) => new Date(date.getTime() + Number(days || 0) * MS_PER_DAY);
const daysBetween = (from, to) => Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalize = (value) => String(value || "").trim().toLowerCase();

const median = (values = [], fallback = DEFAULT_SERVICE_INTERVAL_DAYS) => {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 30 && value <= 730).sort((a, b) => a - b);
  if (!valid.length) return fallback;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : Math.round((valid[middle - 1] + valid[middle]) / 2);
};

const normalizeServiceType = serviceTypeFor;

const serviceDatesFor = (histories = []) => histories
  .filter((history) => ["regular_cleaning", "deep_cleaning"].includes(normalizeServiceType(history)))
  .map((history) => asDate(history.serviceDate))
  .filter(Boolean)
  .sort((a, b) => a.getTime() - b.getTime());

const intervalSamplesForUnits = (units = [], histories = [], asOfDate = new Date()) => {
  const historyByUnit = new Map();
  histories.forEach((history) => {
    const key = String(history.unit || "");
    const current = historyByUnit.get(key) || [];
    current.push(history);
    historyByUnit.set(key, current);
  });

  const samples = [];
  units.forEach((unit) => {
    const validHistory = (historyByUnit.get(String(unit._id || unit.id)) || [])
      .filter((history) => assessServiceEvidence(history, { asOfDate, installedAt: unit.installation?.installedAt }).eligible);
    const dates = [...new Set(serviceDatesFor(validHistory).map((date) => businessDay(date).getTime()))].map((date) => new Date(date));
    const installedAt = unit.installation?.installedAt ? businessDay(unit.installation.installedAt) : null;
    const anchors = installedAt && (!dates[0] || installedAt < dates[0]) ? [installedAt, ...dates] : dates;
    for (let index = 1; index < anchors.length; index += 1) {
      const interval = daysBetween(anchors[index - 1], anchors[index]);
      if (interval >= 30 && interval <= 730) samples.push(interval);
    }
  });
  return samples;
};

const selectHistoricalCohort = (levels = []) => {
  const selected = levels.find((item) => item.samples.length >= MIN_HISTORICAL_SAMPLES);
  if (selected) {
    return {
      level: selected.level,
      intervalDays: clamp(median(selected.samples), 90, 365),
      sampleSize: selected.samples.length,
      comparableUnitCount: selected.units.length,
      unitIds: selected.units.map((candidate) => candidate._id),
    };
  }
  return {
    level: "system_default",
    intervalDays: DEFAULT_SERVICE_INTERVAL_DAYS,
    sampleSize: 0,
    comparableUnitCount: 0,
    unitIds: [],
  };
};

const resolveProductCategory = async (unit) => {
  if (unit.category) return normalize(unit.category);
  if (!mongoose.isValidObjectId(String(unit.productId || ""))) return "";
  const product = await Product.findById(unit.productId).select("category").lean();
  return normalize(product?.category);
};

const collectHistoricalCohort = async (unit, asOfDate) => {
  const category = await resolveProductCategory(unit);
  if (!normalize(unit.brand)) return selectHistoricalCohort([]);
  const escapedBrand = String(unit.brand).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const allComparable = await Unit.find({
    brand: new RegExp(`^${escapedBrand}$`, "i"),
    status: { $ne: "retired" },
  }).select("brand modelName capacityHp category installation.installedAt").lean();

  const sameBrand = allComparable.filter((candidate) => normalize(candidate.brand) === normalize(unit.brand));
  const sameModel = sameBrand.filter((candidate) => normalize(unit.modelName) && normalize(candidate.modelName) === normalize(unit.modelName) && Number(candidate.capacityHp) === Number(unit.capacityHp));
  const sameBrandType = sameBrand.filter((candidate) => {
    const categoryMatch = category && normalize(candidate.category) === category;
    const hp = Number(candidate.capacityHp || 0);
    const targetHp = Number(unit.capacityHp || 0);
    const capacityMatch = hp && targetHp && Math.abs(hp - targetHp) <= 0.5;
    // Do not call an equal-HP window unit the same "type" as a split unit.
    // Include same-model records here too when that narrower cohort is sparse.
    return Boolean(categoryMatch && (!hp || !targetHp || capacityMatch));
  });
  const ids = allComparable.map((candidate) => candidate._id);
  const histories = ids.length
    ? await ServiceHistory.find({ unit: { $in: ids } }).sort({ serviceDate: 1 }).lean()
    : [];

  const samplesFor = (units) => intervalSamplesForUnits(units, histories, asOfDate);
  const levels = [
    { level: "same_model", units: sameModel, samples: samplesFor(sameModel) },
    { level: "same_brand_type", units: sameBrandType, samples: samplesFor(sameBrandType) },
    { level: "same_brand", units: sameBrand, samples: samplesFor(sameBrand) },
  ];
  return selectHistoricalCohort(levels);
};

const basisText = ({ level, intervalDays, sampleSize }) => {
  const months = Math.max(1, Math.round(intervalDays / 30));
  if (level === "same_model") return `Based on ${sampleSize} recorded service interval(s) from the same AC model, typically about ${months} month(s).`;
  if (level === "same_brand_type") return `Based on ${sampleSize} recorded service interval(s) from similar AC units of the same brand and type, typically about ${months} month(s).`;
  if (level === "same_brand") return `Based on ${sampleSize} recorded service interval(s) from the same AC brand, typically about ${months} month(s).`;
  return `Provisional schedule using the system's configured ${intervalDays}-day interval. There are not yet enough complete service records for this model or brand to calculate a history-based interval. Confirm the schedule with your service team.`;
};

const capacityAssessmentFor = ({ roomSizeSqm, capacityHp }) => {
  const room = Number(roomSizeSqm || 0);
  const hp = Number(capacityHp || 0);
  if (!Number.isFinite(room) || room <= 0) return { status: "room_size_required", summary: "Room size information is required to evaluate AC capacity." };
  if (!Number.isFinite(hp) || hp <= 0) return { status: "capacity_required", summary: "AC horsepower information is required to evaluate cooling capacity." };
  const expectedRoomSize = hp * 14;
  const ratio = room / expectedRoomSize;
  const basis = " This is an approximate room-size comparison using the system's 14 m² per HP rule, not a measured cooling-load assessment.";
  if (ratio > 1.25) return { status: "insufficient", summary: "AC horsepower may be insufficient for the provided room size." + basis };
  if (ratio < 0.6) return { status: "higher_than_necessary", summary: "AC horsepower may be higher than necessary for the provided room size." + basis };
  return { status: "suitable", summary: "AC horsepower appears appropriate for the provided room size." + basis };
};

const cleaningMethodForDates = ({ lastCleaningDate, installationDate, asOfDate = new Date() } = {}) => {
  const reference = asDate(lastCleaningDate) || asDate(installationDate);
  if (!reference) return "";
  const referenceDate = startOfUtcDay(reference);
  const oneYearAnniversary = new Date(referenceDate.getTime());
  oneYearAnniversary.setUTCFullYear(oneYearAnniversary.getUTCFullYear() + 1);
  return startOfUtcDay(asOfDate) > oneYearAnniversary
    ? "deep_cleaning"
    : "regular_cleaning";
};

const calculateMaintenanceRecommendation = async (unitId, options = {}) => {
  const unit = await Unit.findById(unitId);
  if (!unit) {
    const error = new Error("Unit not found");
    error.status = 404;
    throw error;
  }
  const calculationDate = asDate(options.asOfDate || new Date());
  if (!calculationDate) { const error = new Error("Enter a valid calculation date."); error.status = 400; throw error; }
  const asOfDate = startOfUtcDay(calculationDate);
  const allHistory = await ServiceHistory.find({ unit: unit._id }).sort({ serviceDate: -1 }).lean();
  const ownHistory = allHistory.filter((history) => assessServiceEvidence(history, { asOfDate: calculationDate, installedAt: unit.installation?.installedAt }).eligible);
  const cohortKey = `${normalize(unit.brand)}:${normalize(unit.modelName)}:${unit.capacityHp}:${unit.category}`;
  let cohort = options.cohortCache?.get(cohortKey);
  if (!cohort) { cohort = await collectHistoricalCohort(unit, calculationDate); options.cohortCache?.set(cohortKey, cohort); }
  const lastService = ownHistory.find((history) => normalizeServiceType(history) !== "installation") || null;
  const lastCleaning = ownHistory.find((history) => ["regular_cleaning", "deep_cleaning"].includes(normalizeServiceType(history))) || null;
  const lastServiceDate = asDate(lastService?.serviceDate);
  const lastCleaningDate = asDate(lastCleaning?.serviceDate);
  const recordedInstallation = asDate(unit.installation?.installedAt);
  const installedAt = recordedInstallation && startOfUtcDay(recordedInstallation) <= asOfDate ? recordedInstallation : null;
  const anchor = lastCleaningDate || installedAt;
  const bestServicedBy = anchor ? addDays(startOfUtcDay(anchor), cohort.intervalDays) : null;
  const recommendedService = cleaningMethodForDates({
    lastCleaningDate,
    installationDate: installedAt,
    asOfDate,
  });
  const capacityAssessment = capacityAssessmentFor(unit);
  const basis = anchor ? basisText(cohort) : "A completed cleaning or installation date is needed before a servicing date can be suggested.";
  const excludedRecordCount = allHistory.length - ownHistory.length;
  const dataQuality = { excludedRecordCount, message: excludedRecordCount ? `${excludedRecordCount} service record(s) have missing details or invalid dates and are excluded from maintenance timing. Ask the service team to review them.` : "", anchorType: lastCleaningDate ? "last_cleaning" : installedAt ? "installation" : "missing" };

  if (options.persist !== false) {
    unit.amp = {
      ...(unit.amp?.toObject?.() || unit.amp || {}),
      bestServicedBy,
      recommendedService,
      recommendationBasis: basis,
      basisLevel: cohort.level,
      intervalDays: cohort.intervalDays,
      baseIntervalDays: cohort.intervalDays,
      comparableSampleSize: cohort.sampleSize,
      lastServiceDate,
      lastCleaningDate,
      capacityAssessment,
      nextIdealServiceDate: bestServicedBy,
      nextIdealServicePeriod: bestServicedBy ? `Suggested servicing date: ${bestServicedBy.toISOString().slice(0, 10)}` : "Installation or cleaning date required",
      lastCalculatedAt: new Date(),
      dataQuality,
    };
    if (["active", "service_due"].includes(unit.status) && bestServicedBy) unit.status = bestServicedBy < asOfDate ? "service_due" : "active";
    await unit.save();
  }

  return {
    unitId: String(unit._id),
    serialNumber: unit.serialNumber,
    brand: unit.brand,
    model: unit.modelName,
    category: unit.category || "",
    capacityHp: unit.capacityHp || 0,
    roomSizeSqm: unit.roomSizeSqm || null,
    bestServicedBy: bestServicedBy?.toISOString() || null,
    best_serviced_by: bestServicedBy?.toISOString() || null,
    recommendedService,
    recommended_service: recommendedService,
    lastServiceDate: lastServiceDate?.toISOString() || null,
    lastCleaningDate: lastCleaningDate?.toISOString() || null,
    recommendationBasis: basis,
    historicalBasis: {
      level: cohort.level,
      intervalDays: cohort.intervalDays,
      baseIntervalDays: cohort.intervalDays,
      sampleSize: cohort.sampleSize,
      comparableUnitCount: cohort.comparableUnitCount,
    },
    capacityAssessment,
    dataQuality,
    overdue: Boolean(bestServicedBy && bestServicedBy < asOfDate),
    generatedAt: new Date().toISOString(),
  };
};

const refreshMaintenanceRecommendations = async (query = {}, asOfDate = new Date()) => {
  const units = await Unit.find({ ...query, status: { $in: ["active", "service_due"] } }).select("_id").lean();
  const cohortCache = new Map();
  for (const unit of units) await calculateMaintenanceRecommendation(unit._id, { asOfDate, cohortCache });
};

module.exports = {
  DEFAULT_SERVICE_INTERVAL_DAYS,
  calculateMaintenanceRecommendation,
  capacityAssessmentFor,
  cleaningMethodForDates,
  normalizeServiceType,
  selectHistoricalCohort,
  intervalSamplesForUnits,
  refreshMaintenanceRecommendations,
};
