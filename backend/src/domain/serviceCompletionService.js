const Unit = require("../models/Unit");
const ServiceHistory = require("../models/ServiceHistory");
const { calculateMaintenanceRecommendation } = require("./ampMaintenanceService");
const { appendWarrantyEvent, effectiveWarrantyStatus } = require("./warrantyService");
const { normalizeEnvironmentProfile } = require("./ampEnvironmentRisk");

const clean = (value, max = 1000) => String(value || "").trim().slice(0, max);
const list = (value) => (Array.isArray(value) ? value : String(value || "").split(","))
  .map((item) => clean(item, 160))
  .filter(Boolean);

const resolveExplicitServiceType = (payload = {}) => {
  const value = clean(payload.service_type || payload.serviceType || payload.cleaning_type || payload.visit_type).toLowerCase().replace(/[\s-]+/g, "_");
  if (["regular_cleaning", "deep_cleaning", "repair", "inspection", "installation"].includes(value)) return value;
  return "";
};

const visitTypeFor = (serviceType) => {
  if (serviceType === "repair") return "repair";
  if (serviceType === "inspection") return "inspection";
  if (serviceType === "installation") return "installation";
  return "scheduled_service";
};

const validateStrictServicePayload = (payload = {}) => {
  const errors = {};
  const serviceType = resolveExplicitServiceType(payload);
  const findings = clean(payload.findings || payload.notes || payload.proof_notes, 1000);
  const actions = list(payload.service_actions || payload.serviceActions || payload.action_taken || payload.resolution);
  const conditionRating = clean(payload.condition_rating || payload.conditionRating).toLowerCase();
  const serviceDate = new Date(payload.service_date || payload.serviceDate || new Date());

  if (!serviceType) errors.serviceType = "Choose the service type performed.";
  if (findings.length < 10) errors.findings = "Record technician findings using at least 10 characters.";
  if (!actions.length) errors.serviceActions = "Record at least one action performed.";
  if (!["excellent", "good", "fair", "poor"].includes(conditionRating)) {
    errors.conditionRating = "Choose excellent, good, fair, or poor for the unit condition.";
  }
  if (Number.isNaN(serviceDate.getTime())) errors.serviceDate = "Enter a valid service date.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    values: { serviceType, findings, actions, conditionRating, serviceDate },
  };
};

const completeServiceForUnit = async ({ unitId, technicianId, payload = {} }) => {
  const validation = validateStrictServicePayload(payload);
  if (!validation.ok) {
    const error = new Error("Complete the required technician service report.");
    error.status = 400;
    error.errors = validation.errors;
    throw error;
  }
  const unit = await Unit.findById(unitId);
  if (!unit) {
    const error = new Error("Unit not found");
    error.status = 404;
    throw error;
  }

  const { serviceDate, serviceType, findings, actions, conditionRating } = validation.values;
  const partsUsed = list(payload.parts_used || payload.partsUsed);

  const serviceHistory = await ServiceHistory.create({
    unit: unit._id,
    technician: technicianId,
    serviceDate,
    visitType: visitTypeFor(serviceType),
    serviceType,
    conditionRating,
    findings,
    actionTaken: actions.join(", "),
    partsUsed,
    technicianInputs: {
      usageHoursPerDay: Number(payload.usage_hours_per_day || payload.usageHoursPerDay || 8),
      filterCondition: clean(payload.filter_condition || payload.filterCondition || "normal").toLowerCase(),
      coilCondition: clean(payload.coil_condition || payload.coilCondition || "normal").toLowerCase(),
      drainageCondition: clean(payload.drainage_condition || payload.drainageCondition || "clear").toLowerCase(),
      voltageStability: clean(payload.voltage_stability || payload.voltageStability || "stable").toLowerCase(),
      placementArea: clean(payload.placement_area || payload.placementArea || unit.installation?.addressLine),
      notes: findings,
    },
    serviceActions: actions,
  });

  unit.environmentProfile = normalizeEnvironmentProfile({
    ...(unit.environmentProfile?.toObject?.() || unit.environmentProfile || {}),
    placementArea: payload.placement_area || payload.placementArea || unit.environmentProfile?.placementArea,
    placementType: payload.placement_type || payload.placementType || unit.environmentProfile?.placementType,
    usageHoursPerDay: payload.usage_hours_per_day || payload.usageHoursPerDay || unit.environmentProfile?.usageHoursPerDay,
    occupancyLevel: payload.occupancy_level || payload.occupancyLevel || unit.environmentProfile?.occupancyLevel,
    dustExposure: payload.dust_exposure || payload.dustExposure || unit.environmentProfile?.dustExposure,
    humidityExposure: payload.humidity_exposure || payload.humidityExposure || unit.environmentProfile?.humidityExposure,
    greaseSmokeExposure: payload.grease_smoke_exposure || payload.greaseSmokeExposure || unit.environmentProfile?.greaseSmokeExposure,
    coastalExposure: payload.coastal_exposure ?? payload.coastalExposure ?? unit.environmentProfile?.coastalExposure,
    directSunExposure: payload.direct_sun_exposure || payload.directSunExposure || unit.environmentProfile?.directSunExposure,
    filterCondition: payload.filter_condition || payload.filterCondition || unit.environmentProfile?.filterCondition,
    coilCondition: payload.coil_condition || payload.coilCondition || unit.environmentProfile?.coilCondition,
    drainageCondition: payload.drainage_condition || payload.drainageCondition || unit.environmentProfile?.drainageCondition,
    voltageStability: payload.voltage_stability || payload.voltageStability || unit.environmentProfile?.voltageStability,
    notes: findings,
    capturedBy: technicianId,
    capturedAt: serviceDate,
  });
  unit.status = "active";
  await unit.save();
  const recommendation = await calculateMaintenanceRecommendation(unit._id, { asOfDate: serviceDate });
  serviceHistory.ampSnapshot = {
    bestServicedBy: recommendation.bestServicedBy,
    recommendedService: recommendation.recommendedService,
    recommendationBasis: recommendation.recommendationBasis,
    nextIdealServiceDate: recommendation.bestServicedBy,
    nextIdealServicePeriod: `Best serviced by ${new Date(recommendation.bestServicedBy).toLocaleDateString("en-US")}`,
    calculatedAt: new Date(),
  };
  await serviceHistory.save();

  const warranty = unit.warranty?.toObject?.() || unit.warranty || {};
  if (warranty?.startDate) {
    const claimId = clean(payload.warranty_claim_id || payload.warrantyClaimId);
    const claims = Array.isArray(warranty.claims) ? warranty.claims : [];
    const claimIndex = claimId ? claims.findIndex((claim) => String(claim?.claimId || "") === claimId) : -1;
    if (claimIndex >= 0) claims[claimIndex] = { ...claims[claimIndex], status: "service_completed", resolvedAt: new Date(), serviceHistoryId: String(serviceHistory._id) };
    warranty.claims = claims;
    warranty.serviceRecords = [
      ...(Array.isArray(warranty.serviceRecords) ? warranty.serviceRecords : []),
      { serviceDate, visitType: serviceType, summary: findings, serviceHistoryId: String(serviceHistory._id), claimId },
    ];
    warranty.status = effectiveWarrantyStatus({ ...warranty, status: "active" });
    warranty.timeline = appendWarrantyEvent(
      warranty,
      claimIndex >= 0 ? "Warranty Service Completed" : "Warranty Service Record Added",
      claimIndex >= 0 ? "Approved warranty claim service was completed." : "Service history and AMP recommendation were updated.",
    );
    unit.warranty = warranty;
    await unit.save();
  }

  return { unit, serviceHistory, recommendation };
};

module.exports = { completeServiceForUnit, validateStrictServicePayload };
