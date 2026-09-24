export const COMPANY_CONTACT = {
  name: "Cold Air ACT",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "coldairairconditioning@yahoo.com",
  salesEmail: import.meta.env.VITE_SALES_EMAIL || "coldairairconditioning@yahoo.com",
  hotline: import.meta.env.VITE_SUPPORT_PHONE || "09086854532",
  officeHours: "8:00 AM–5:00 PM, Monday–Friday",
};

// Shared company identity used by operational reports and read-only account
// surfaces. Keep this as the single frontend source until company identity is
// represented by a backend model.
export const COMPANY_PROFILE = {
  name: "Cold Air Airconditioning Trading",
  address: "Block 2 Lot 1, Amaresa Subd., Brgy. Guijo, Francisco Homes, San Jose del Monte City, 3023 Bulacan",
  proprietor: "Percival III M. Balmores – Proprietor",
  contact: "(0969) 336 1590",
  taxRegistration: "TIN 451 318 429",
};

export const COMPANY_BRANCHES = [
  { id: "bulacan", branch: "Bulacan", name: "Bulacan (Main Branch)", address: "Plaridel, Bulacan" },
  { id: "cavite", branch: "Cavite", name: "Cavite Branch", address: "Dasmariñas, Cavite" },
  { id: "laguna", branch: "Laguna", name: "Laguna Branch", address: "Cabuyao, Laguna" },
  { id: "bataan", branch: "Bataan", name: "Bataan Branch", address: "Balanga, Bataan" },
  { id: "pangasinan", branch: "Pangasinan", name: "Pangasinan Branch", address: "Dagupan, Pangasinan" },
  { id: "ilocos", branch: "Ilocos", name: "Ilocos Branch", address: "San Fernando, La Union" },
];

export const getCompanyBranch = (assignedBranch = "") => {
  const normalized = String(assignedBranch || "").trim().toLowerCase();
  if (!normalized) return null;
  return COMPANY_BRANCHES.find((branch) => (
    branch.id === normalized || branch.branch.toLowerCase() === normalized
  )) || null;
};
