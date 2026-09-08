const crypto = require("node:crypto");
const { businessDay } = require("../utils/dateTime");
const ENGINE_VERSION = "openai-maintenance-v1";
const REASONS = ["earlier_interval", "typical_interval", "later_interval"];
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

// Only validated, de-identified timing evidence crosses the provider boundary.
// The 90–365 day envelope is an engineering safeguard, not a warranty policy.
function predictionEvidence({ unit, cohort, ownHistory, lastCleaningDate, installedAt, asOfDate }) {
  const histogram = {};
  for (const days of cohort.samples || []) histogram[days] = (histogram[days] || 0) + 1;
  const anchor = lastCleaningDate || installedAt;
  const evidence = {
    version: ENGINE_VERSION,
    brand: String(unit.brand || "").slice(0, 100), model: String(unit.modelName || "").slice(0, 150),
    category: String(unit.category || "").slice(0, 50), capacityHp: Number(unit.capacityHp) || null,
    anchorDate: anchor ? businessDay(anchor).toISOString() : null,
    cohort: { level: cohort.level, sampleSize: cohort.sampleSize, comparableUnitCount: cohort.comparableUnitCount,
      intervalHistogram: histogram, baselineIntervalDays: cohort.intervalDays },
    ownServices: ownHistory.map(h => ({ date: businessDay(h.serviceDate).toISOString(), type: h.normalizedType }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type)),
  };
  const fingerprint = hash(evidence);
  const samples = Object.keys(histogram).map(Number);
  const minimumDays = samples.length ? Math.max(90, Math.min(365, Math.min(...samples))) : 90;
  const maximumDays = samples.length ? Math.max(90, Math.min(365, Math.max(...samples))) : 365;
  return { ...evidence, ownServices: evidence.ownServices.slice(-50), fingerprint, asOfDate: businessDay(asOfDate).toISOString(),
    eligible: Boolean(anchor && cohort.level !== "system_default" && cohort.sampleSize >= 2 && samples.length),
    minimumDays, maximumDays };
}

function validPrediction(raw, evidence) {
  if (!evidence?.eligible || !raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (Object.keys(raw).sort().join(",") !== "interval_days,reason_code") return false;
  const days = raw.interval_days;
  if (!Number.isInteger(days) || days < evidence.minimumDays || days > evidence.maximumDays || !REASONS.includes(raw.reason_code)) return false;
  const baseline = evidence.cohort.baselineIntervalDays;
  return raw.reason_code === (days < baseline ? "earlier_interval" : days > baseline ? "later_interval" : "typical_interval");
}

function predictionBasis(prediction, evidence) {
  const direction = { earlier_interval: "an earlier", typical_interval: "the typical", later_interval: "a later" }[prediction.reason_code];
  return `AI-estimated servicing interval: ${prediction.interval_days} days after the last verified cleaning or installation. OpenAI selected ${direction} interval using ${evidence.cohort.sampleSize} recorded cleaning interval(s) from ${evidence.cohort.level.replaceAll("_", " ")} history. This estimate is bounded by recorded intervals and the system's 90–365 day safeguard. It is not a validated failure prediction, confirmed booking, or warranty decision.`;
}

function savedPredictionIsCurrent(saved, evidence, asOfDate) {
  return saved?.engineVersion === ENGINE_VERSION && saved.fingerprint === evidence.fingerprint
    && Number.isFinite(Date.parse(saved.generatedAt)) && new Date(saved.generatedAt) <= new Date(asOfDate)
    && validPrediction(saved.prediction, evidence);
}

module.exports = { ENGINE_VERSION, REASONS, predictionEvidence, validPrediction, predictionBasis, savedPredictionIsCurrent };
