const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const choice = (value, allowed, fallback) => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
};

const normalizeEnvironmentProfile = (input = {}, fallback = {}) => {
  const source = { ...(fallback || {}), ...(input || {}) };
  const usage = Number(source.usageHoursPerDay);
  return {
    placementType: choice(source.placementType || source.placementArea, ["bedroom", "living_room", "office", "kitchen", "commercial", "other"], "other"),
    placementArea: String(source.placementArea || "").trim().slice(0, 160),
    usageHoursPerDay: Number.isFinite(usage) ? clamp(usage, 0, 24) : 8,
    occupancyLevel: choice(source.occupancyLevel, ["low", "normal", "high"], "normal"),
    dustExposure: choice(source.dustExposure, ["low", "normal", "high"], "normal"),
    humidityExposure: choice(source.humidityExposure, ["low", "normal", "high"], "normal"),
    greaseSmokeExposure: choice(source.greaseSmokeExposure, ["none", "moderate", "high"], "none"),
    coastalExposure: source.coastalExposure === true || String(source.coastalExposure).toLowerCase() === "true",
    directSunExposure: choice(source.directSunExposure, ["low", "normal", "high"], "normal"),
    filterCondition: choice(source.filterCondition, ["clean", "normal", "dusty", "clogged"], "normal"),
    coilCondition: choice(source.coilCondition, ["clean", "normal", "dusty", "iced"], "normal"),
    drainageCondition: choice(source.drainageCondition, ["clear", "slow", "blocked"], "clear"),
    voltageStability: choice(source.voltageStability, ["stable", "fluctuating", "unstable"], "stable"),
    notes: String(source.notes || "").trim().slice(0, 500),
    capturedBy: source.capturedBy || undefined,
    capturedAt: source.capturedAt || null,
  };
};

const assessEnvironmentRisk = (profileInput = {}, baseIntervalDays = 270) => {
  const profile = normalizeEnvironmentProfile(profileInput);
  let score = 0;
  const reasons = [];
  const add = (points, reason) => { score += points; reasons.push(reason); };

  if (profile.usageHoursPerDay > 12) add(2, "more than 12 hours of daily use");
  else if (profile.usageHoursPerDay > 8) add(1, "extended daily use");
  if (["kitchen", "commercial"].includes(profile.placementType)) add(2, `${profile.placementType.replace(/_/g, " ")} placement`);
  else if (profile.placementType === "office") add(1, "office placement");
  if (profile.occupancyLevel === "high") add(1, "high room occupancy");
  if (profile.dustExposure === "high") add(3, "high dust exposure");
  if (profile.humidityExposure === "high") add(2, "high humidity exposure");
  if (profile.greaseSmokeExposure === "high") add(3, "high grease or smoke exposure");
  else if (profile.greaseSmokeExposure === "moderate") add(1, "some grease or smoke exposure");
  if (profile.coastalExposure) add(2, "coastal air exposure");
  if (profile.directSunExposure === "high") add(1, "strong direct-sun exposure");
  if (profile.filterCondition === "clogged") add(3, "clogged filter condition");
  else if (profile.filterCondition === "dusty") add(2, "dusty filter condition");
  if (["dusty", "iced"].includes(profile.coilCondition)) add(2, `${profile.coilCondition} coil condition`);
  if (profile.drainageCondition === "blocked") add(2, "blocked drainage");
  else if (profile.drainageCondition === "slow") add(1, "slow drainage");
  if (profile.voltageStability === "unstable") add(2, "unstable voltage");
  else if (profile.voltageStability === "fluctuating") add(1, "fluctuating voltage");

  const level = score >= 10 ? "severe" : score >= 6 ? "high" : score >= 3 ? "moderate" : "low";
  const multiplier = { low: 1, moderate: 0.9, high: 0.75, severe: 0.6 }[level];
  const base = clamp(Math.round(Number(baseIntervalDays) || 270), 90, 365);
  const adjustedIntervalDays = clamp(Math.round(base * multiplier), 90, 365);
  return {
    recorded: Boolean(profile.capturedAt || profile.placementArea),
    score,
    level,
    multiplier,
    baseIntervalDays: base,
    adjustedIntervalDays,
    reasons: reasons.slice(0, 8),
  };
};

const environmentSummary = (risk = {}) => {
  if (!risk?.recorded) return "Operating conditions have not yet been recorded, so the current schedule uses neutral environmental conditions.";
  if (!risk || risk.level === "low") return "Recorded operating conditions do not currently shorten the standard maintenance interval.";
  const reasonText = (risk.reasons || []).slice(0, 3).join(", ");
  return `${String(risk.level || "moderate").replace(/_/g, " ")} environmental risk shortens the maintenance interval${reasonText ? ` because of ${reasonText}` : ""}.`;
};

module.exports = { assessEnvironmentRisk, environmentSummary, normalizeEnvironmentProfile };
