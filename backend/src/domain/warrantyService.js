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
  if (["under_review", "approved", "rejected", "void"].includes(status)) return status;
  const expiration = warranty.expirationDate ? new Date(warranty.expirationDate) : null;
  if (expiration && !Number.isNaN(expiration.getTime()) && expiration < new Date()) return "expired";
  return status || "active";
};

const getWarrantyRecommendation = (warranty = {}) => {
  const status = effectiveWarrantyStatus(warranty);
  if (status === "pending_activation") {
    return "No action is needed. Your warranty activates automatically after a technician completes and verifies the installation.";
  }
  if (status === "under_review") return "Your warranty claim is under review.";
  if (status === "approved") return "Warranty service is approved. Keep the scheduled appointment.";
  if (status === "rejected") return "This warranty claim was not approved. Review the decision note or contact support if you need help.";
  if (status === "expired") return "Warranty coverage has expired. Continue preventive maintenance.";
  if (status === "void") return "Warranty coverage is unavailable. Contact support if you need an explanation.";
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
    status: effectiveWarrantyStatus({ ...current, status: current.status || "active", expirationDate: current.expirationDate || addMonths(startDate, durationMonths) }),
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
