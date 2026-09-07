const Unit = require('../models/Unit');
const ServiceRequest = require('../models/ServiceRequest');
const { isValidObjectId } = require('mongoose');

// Match both IDs so cancelling a job cannot close another claim on the unit.
async function cancelWarrantyForRequest(request, reason = 'The associated service visit was cancelled.') {
  const claimId = request.payload?.warrantyClaimId;
  if (!claimId || !request.unitId || request.status !== 'Cancelled') return;
  await Unit.updateOne({
    _id: request.unitId,
    'warranty.claims': { $elemMatch: { claimId, serviceRequestId: String(request._id || request.id), status: 'approved' } },
  }, {
    $set: { 'warranty.claims.$.status': 'cancelled', 'warranty.claims.$.resolvedAt': new Date(), 'warranty.claims.$.cancellationReason': reason },
    $push: { 'warranty.timeline': { event: 'Warranty Service Cancelled', detail: reason, timestamp: new Date() } },
  });
}

async function reconcileCancelledWarranty(unit) {
  const requestIds = (unit.warranty?.claims || []).filter(claim => claim.status === 'approved' && isValidObjectId(claim.serviceRequestId)).map(claim => claim.serviceRequestId);
  if (!requestIds.length) return unit;
  const cancelled = await ServiceRequest.find({ _id: { $in: requestIds }, unitId: String(unit._id), status: 'Cancelled' });
  for (const request of cancelled) await cancelWarrantyForRequest(request, request.payload?.cancellationReason || 'The associated service visit was cancelled.');
  return cancelled.length ? await Unit.findById(unit._id) : unit;
}

module.exports = { cancelWarrantyForRequest, reconcileCancelledWarranty };
