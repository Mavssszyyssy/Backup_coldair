import { apiRequest } from "../../config/api";

const BRANCHES = [
  'Bulacan',
  'Cavite',
  'Laguna',
  'Bataan',
  'Pangasinan',
  'Ilocos',
];

const toSearchParams = (address = {}) => {
  const params = new URLSearchParams();
  ["city", "province", "region", "barangay", "street"].forEach((field) => {
    const value = String(address[field] || "").trim();
    if (value) params.set(field, value);
  });
  return params.toString();
};

// Branch coverage belongs to the backend. This prevents a browser build from
// keeping an obsolete service-area map after Super Admin updates coverage.
export const resolveConfiguredBranch = async (address = {}) => {
  const query = toSearchParams(address);
  if (!query) return "";
  const result = await apiRequest(`/branches/resolve?${query}`);
  return result?.serviceable ? String(result.branch || "") : "";
};

// Kept as a safe, no-assignment fallback for older callers. Checkout and shop
// use resolveConfiguredBranch so an unknown address is never shown as Bulacan.
export const resolvePreferredBranch = () => "";

export const getBranchSearchOrder = (preferredBranch) =>
  preferredBranch ? [preferredBranch, ...BRANCHES.filter((branch) => branch !== preferredBranch)] : [];
