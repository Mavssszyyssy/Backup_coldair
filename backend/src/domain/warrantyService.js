const DEFAULT_DURATION_MONTHS = 60;
const DEFAULT_COMPONENTS = ["Parts (1 year)", "Compressor (5 years)"];
const ADVERTISED_POLICY = "shop-parts-12-compressor-60";
const DEFAULT_LIMITATIONS = [
  "Coverage follows the manufacturer and installation terms.",
  "Parts are covered for 1 year and the compressor for 5 years. Labor is not automatically included; the branch reviews each claim.",
  "Damage caused by misuse, electrical instability, accidents, or unauthorized repair is not covered.",
];

const asDate = (value, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + Number(months || DEFAULT_DURATION_MONTHS));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
};

const asPlain = (value) => value?.toObject?.() || value || {};

const getWarrantyCoverage = (value = {}, now = new Date()) => {
  const warranty = asPlain(value);
  if (warranty.policyVersion !== ADVERTISED_POLICY) return {
    coverageSummary: "Existing warranty record: confirm component-specific coverage with the branch. Shop offer: 1 year parts, 5 years compressor.",
    componentCoverage: [],
  };
  const rows = [{ component: "Parts", durationMonths: 12, expirationDate: warranty.partsExpirationDate }, { component: "Compressor", durationMonths: 60, expirationDate: warranty.compressorExpirationDate }];
  const start = warranty.startDate ? new Date(warranty.startDate) : null;
  return {
    coverageSummary: "1 year parts, 5 years compressor. Labor is subject to branch review.",
    componentCoverage: rows.map((row) => {
      const expiration = row.expirationDate ? new Date(row.expirationDate) : null;
      const recordedStatus = String(warranty.status || "").toLowerCase();
      let status = "pending_activation";
      if (recordedStatus === "void") status = "void";
      else if (start && expiration && Number.isFinite(start.getTime()) && Number.isFinite(expiration.getTime()) && start <= now && expiration >= start) {
        if (expiration < now || recordedStatus === "expired") status = "expired";
        else if (["active", "under_review", "approved", "rejected"].includes(recordedStatus)) status = "active";
      }
      return { ...row, status };
    }),
  };
};

const warrantyApprovalError = (warranty, component, now = new Date()) => {
  if (warranty.policyVersion !== ADVERTISED_POLICY) return "";
  const coverage = getWarrantyCoverage(warranty, now).componentCoverage;
  const selected = coverage.find((item) => item.component.toLowerCase() === String(component || "").toLowerCase());
  if (!selected) return "Select the covered component: Parts or Compressor.";
  return selected.status === "active" ? "" : `${selected.component} coverage is ${selected.status.replace(/_/g, " ")}. This repair cannot be approved under that coverage.`;
};

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
  if (claimStatus === 'cancelled') return 'This warranty service visit was cancelled. You can submit a new request if support is still needed. Your coverage dates have not changed.';
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
  const coverage = getWarrantyCoverage(warranty);
  const partsExpired = coverage.componentCoverage.some((row) => row.component === "Parts" && row.status === "expired");
  return partsExpired ? "Parts coverage has expired; compressor coverage remains active. The branch will review which component and service costs your claim covers." : `Warranty is active. ${coverage.coverageSummary} Keep completed service records to support your claim.`;
};

const buildActivatedWarranty = (existingWarranty, installedAt) => {
  const current = asPlain(existingWarranty);
  // Apply the confirmed shop policy to new activations only. Do not silently
  // rewrite contracts or historical coverage on already-activated units.
  const useAdvertisedPolicy = current.policyVersion === ADVERTISED_POLICY || (!current.startDate && !current.expirationDate);
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
    ...(useAdvertisedPolicy ? {
      policyVersion: ADVERTISED_POLICY,
      warrantyType: "1 year parts / 5 years compressor",
      partsExpirationDate: current.partsExpirationDate || addMonths(startDate, 12),
      compressorExpirationDate: current.compressorExpirationDate || addMonths(startDate, 60),
      expirationDate: current.compressorExpirationDate || addMonths(startDate, 60),
      durationMonths: 60,
      coveredComponents: DEFAULT_COMPONENTS,
      coverageLimitations: DEFAULT_LIMITATIONS,
    } : {}),
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
  getWarrantyCoverage,
  ADVERTISED_POLICY,
  warrantyApprovalError,
};
