function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildMaintenanceRecommendation({ unit } = {}) {
  const bestServicedBy = unit?.bestServicedBy || unit?.amp?.bestServicedBy || unit?.amp?.nextIdealServiceDate || "";
  const recommendedService = unit?.recommendedService || unit?.amp?.recommendedService || "regular_cleaning";
  return {
    bestServicedBy, recommendedService,
    recommendationBasis: unit?.recommendationBasis || unit?.amp?.recommendationBasis || "Maintenance timing is being calculated from recorded service history.",
    capacityAssessment: unit?.capacityAssessment || unit?.amp?.capacityAssessment || null,
    lastServiceDate: unit?.lastServiceDate || unit?.amp?.lastServiceDate || null,
    lastCleaningDate: unit?.lastCleaningDate || unit?.amp?.lastCleaningDate || null,
    commonComponents: unit?.commonComponents || [],
    overdue: bestServicedBy ? parseDate(bestServicedBy)?.getTime() < Date.now() : false,
  };
}

export function buildNextRecommendedMaintenance(recommendation) {
  const due = parseDate(recommendation?.bestServicedBy);
  const daysUntil = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
  const serviceLabel = recommendation?.recommendedService === "deep_cleaning" ? "Deep cleaning" : "Regular cleaning";
  return {
    date: due ? due.toISOString().slice(0, 10) : "",
    label: due ? (daysUntil < 0 ? `${Math.abs(daysUntil)} day(s) overdue` : `Due in ${daysUntil} day(s)`) : "Date being calculated",
    urgency: daysUntil === null ? "Pending" : daysUntil < 0 ? "Overdue" : daysUntil <= 30 ? "Due Soon" : "Scheduled",
    color: daysUntil === null ? "#6B7280" : daysUntil < 0 ? "#DC2626" : daysUntil <= 30 ? "#D97706" : "#059669",
    message: `${serviceLabel}. ${recommendation?.recommendationBasis || ""}`.trim(),
    recommendedService: recommendation?.recommendedService || "regular_cleaning",
    capacityAssessment: recommendation?.capacityAssessment || null,
  };
}

export function buildUnitRecommendationMap(units = []) {
  return units.reduce((map, unit) => { map[String(unit.id)] = buildMaintenanceRecommendation({ unit }); return map; }, {});
}
