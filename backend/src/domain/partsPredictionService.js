const ServiceHistory = require("../models/ServiceHistory");
const Unit = require("../models/Unit");
const { MAJOR_COMPONENTS, summarizeMajorComponentUse } = require("./ampComponentCategories");
const { assessServiceEvidence } = require("./serviceEvidence");

const buildRecordedPartsPreparation = async ({ unitId }) => {
  const unit = await Unit.findById(unitId).lean();
  if (!unit) { const error = new Error("Unit not found"); error.status = 404; throw error; }
  const comparableUnits = await Unit.find({
    _id: { $ne: unit._id },
    brand: { $regex: new RegExp(`^${String(unit.brand || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    status: { $ne: "retired" },
  }).select("_id modelName installation.installedAt").lean();
  const installedDates = new Map([unit, ...comparableUnits].map((item) => [String(item._id), item.installation?.installedAt]));
  const ids = [unit._id, ...comparableUnits.map((item) => item._id)];
  const histories = await ServiceHistory.find({ unit: { $in: ids }, partsUsed: { $exists: true, $ne: [] } }).select("unit partsUsed serviceDate serviceType visitType findings actionTaken serviceActions").sort({ serviceDate: -1 }).lean();
  const trends = summarizeMajorComponentUse(histories.filter((history) => assessServiceEvidence(history, { installedAt: installedDates.get(String(history.unit)) }).eligible));
  const parts = trends.map(({ component: name, count: recordedCount }) => ({
    name,
    recordedCount,
    reason: recordedCount
      ? `${name} appears in ${recordedCount} completed service record${recordedCount === 1 ? "" : "s"} for this brand.`
      : `No completed service record currently reports ${name.toLowerCase()} use for this brand.`,
  }));
  return {
    unitId: String(unit._id), serialNumber: unit.serialNumber, generatedAt: new Date().toISOString(), parts,
    majorComponents: MAJOR_COMPONENTS,
    label: "Major-component inventory history",
    note: "This is aggregate inventory planning, not a unit diagnosis. If major-part preparation is necessary, verify both the compressor/motor and control board before dispatch.",
  };
};

module.exports = { buildRecordedPartsPreparation };
