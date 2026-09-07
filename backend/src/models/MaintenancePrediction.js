const mongoose = require("mongoose");

// Append-only server snapshots. No client mutation endpoint is exposed.
const schema = new mongoose.Schema({
  _id: { type: String },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true, index: true, immutable: true },
  capturedAt: { type: Date, required: true, immutable: true },
  engineVersion: { type: String, required: true, immutable: true },
  suggestedDate: { type: Date, required: true, immutable: true },
  recommendedService: { type: String, enum: ["regular_cleaning", "deep_cleaning"], required: true, immutable: true },
  recommendationBasis: { type: String, required: true, immutable: true },
  basisLevel: { type: String, required: true, immutable: true },
  sampleSize: { type: Number, required: true, min: 0, immutable: true },
  comparableUnitCount: { type: Number, required: true, min: 0, immutable: true },
  intervalDays: { type: Number, required: true, immutable: true },
  anchorDate: { type: Date, required: true, immutable: true },
  excludedRecordCount: { type: Number, required: true, min: 0, immutable: true },
}, { versionKey: false });
schema.index({ unit: 1, capturedAt: -1 });
module.exports = mongoose.model("MaintenancePrediction", schema);
