const DEFAULT_DURATION_MONTHS = 60;
const DEFAULT_COMPONENTS = ["Compressor", "Parts", "Labor"];
const DEFAULT_LIMITATIONS = [
  "Coverage follows the manufacturer and installation terms.",
  "Damage caused by misuse, electrical instability, accidents, or unauthorized repair is not covered.",
];

const asDate = (value, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months || DEFAULT_DURATION_MONTHS));
  return next;
};

const asPlain = (value) => value?.toObject?.() || value || {};

const appendWarrantyEvent = (warranty = {}, event, detail = "", timestamp = new Date()) => {
  const timeline = Array.isArray(warranty.timeline) ? warranty.timeline : [];
  return [
    ...timeline,
    {
      event,
      detail: String(detail || ""),
      timestamp: asDate(timestamp),
    },
  ];
};

const effectiveWarrantyStatus = (warranty = {}) => {
  const status = String(warranty.status || "").toLowerCase();
  if (status === "void") return status;
  const start = warranty.startDate ? new Date(warranty.startDate) : null;
  const expiration = warranty.expirationDate ? new Date(warranty.expirationDate) : null;
  if (!start || !expiration || !Number.isFinite(start.getTime()) || !Number.isFinite(expiration.getTime()) || start > new Date()) return "pending_activation";
  if (expiration && !Number.isNaN(expiration.getTime()) && expiration < new Date()) return "expired";
  // Older records stored a claim decision in warranty.status. Coverage and
  // claim workflow are separate concerns, so normalize those legacy values
  // back to active coverage while keeping the decision on the claim itself.
  if (["under_review", "approved", "rejected"].includes(status)) return "active";
  return ["pending_activation", "active", "expired"].includes(status)
    ? status
    : "pending_activation";
};

const getWarrantyRecommendation = (warranty = {}) => {
  const status = effectiveWarrantyStatus(warranty);
  if (status === "pending_activation") {
    return "No action is needed. Your warranty activates automatically after a technician completes and verifies the installation.";
  }
  if (status === "expired") return "Warranty coverage has expired. Continue preventive maintenance.";
  if (status === "void") return "Warranty coverage is unavailable. Contact support if you need an explanation.";
  const claims = Array.isArray(warranty.claims) ? warranty.claims : [];
  const latestClaim = [...claims].sort((left, right) =>
    new Date(right?.reviewedAt || right?.requestedAt || 0) -
    new Date(left?.reviewedAt || left?.requestedAt || 0),
  )[0];
  const claimStatus = String(latestClaim?.status || "").toLowerCase();
  if (["submitted", "under_review"].includes(claimStatus)) {
    return "Your warranty coverage remains active while this claim is reviewed. We will notify you when the decision changes.";
  }
  if (claimStatus === "approved") {
    return latestClaim?.serviceRequestId
      ? "Your warranty claim was approved and a service request was created. The branch team will notify you when a technician and schedule are assigned."
      : "Your warranty claim was approved. The branch team will contact you with the next service step.";
  }
  if (claimStatus === "rejected") {
    return "This claim was not approved, but your remaining warranty coverage stays active. Review the decision note or contact support if you need help.";
  }
  return "Warranty is active. Keep completed service records to protect coverage.";
};

const buildActivatedWarranty = (existingWarranty, installedAt) => {
  const current = asPlain(existingWarranty);
  const startDate = asDate(current.startDate || installedAt);
  const durationMonths = Number(current.durationMonths || DEFAULT_DURATION_MONTHS);
  const base = {
    warrantyType: String(current.warrantyType || "Standard manufacturer warranty"),
    startDate,
    expirationDate: asDate(current.expirationDate, addMonths(startDate, durationMonths)),
    durationMonths,
    coveredComponents: Array.isArray(current.coveredComponents) && current.coveredComponents.length
      ? current.coveredComponents
      : DEFAULT_COMPONENTS,
    coverageLimitations: Array.isArray(current.coverageLimitations) && current.coverageLimitations.length
      ? current.coverageLimitations
      : DEFAULT_LIMITATIONS,
    status: effectiveWarrantyStatus({ ...current, startDate, status: ["void", "expired"].includes(current.status) ? current.status : "active", expirationDate: current.expirationDate || addMonths(startDate, durationMonths) }),
    claims: Array.isArray(current.claims) ? current.claims : [],
    serviceRecords: Array.isArray(current.serviceRecords) ? current.serviceRecords : [],
    timeline: Array.isArray(current.timeline) ? current.timeline : [],
  };
  if (!base.timeline.some((entry) => entry?.event === "Warranty Activated")) {
    base.timeline = appendWarrantyEvent(base, "Warranty Activated", "Installation completed and warranty coverage is active.", startDate);
  }
  return base;
};

module.exports = {
  DEFAULT_DURATION_MONTHS,
  DEFAULT_COMPONENTS,
  DEFAULT_LIMITATIONS,
  asDate,
  appendWarrantyEvent,
  effectiveWarrantyStatus,
  getWarrantyRecommendation,
  buildActivatedWarranty,
};
