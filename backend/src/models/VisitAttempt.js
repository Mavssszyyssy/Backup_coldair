const mongoose = require('mongoose');

// Keep attempt photos outside Task so repeated visits do not exceed its document size.
const schema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  checkedInAt: { type: String, required: true },
  technicianId: { type: String, required: true },
  technicianName: String,
  outcome: { type: String, enum: ['close', 'reschedule'], required: true },
  note: String,
  photo: { uri: String },
  checkIn: mongoose.Schema.Types.Mixed,
  submittedAt: { type: Date, default: Date.now },
  resolution: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
schema.index({ taskId: 1, checkedInAt: 1 }, { unique: true });
module.exports = mongoose.model('VisitAttempt', schema);
