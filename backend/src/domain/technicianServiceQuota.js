const SERVICE_QUOTA_REQUIRED_MESSAGE =
  "A Service Quota is required before this technician can be assigned to a warranty claim.";

const normalizeServiceQuota = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const quota = Number(value);
  return Number.isSafeInteger(quota) && quota > 0 ? quota : null;
};

const requiresWarrantyServiceQuota = (request = {}) =>
  Boolean(String(request?.payload?.warrantyClaimId || request?.warrantyClaimId || "").trim());

const validateWarrantyAssignmentQuota = ({ request, technician } = {}) => {
  if (!requiresWarrantyServiceQuota(request)) return "";
  return normalizeServiceQuota(technician?.serviceQuota)
    ? ""
    : SERVICE_QUOTA_REQUIRED_MESSAGE;
};

module.exports = {
  SERVICE_QUOTA_REQUIRED_MESSAGE,
  normalizeServiceQuota,
  requiresWarrantyServiceQuota,
  validateWarrantyAssignmentQuota,
};
