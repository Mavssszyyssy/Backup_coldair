export const COMPANY_CONTACT = {
  name: "Cold Air ACT",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "coldairairconditionaing@yahoo.com",
  salesEmail: import.meta.env.VITE_SALES_EMAIL || "coldairairconditionaing@yahoo.com",
  hotline: import.meta.env.VITE_SUPPORT_PHONE || "09086854532",
  officeHours: "8:00 AM–5:00 PM, Monday–Friday",
};

export const COMPANY_BRANCHES = [
  { id: "bulacan", name: "Bulacan (Main Branch)", address: "Plaridel, Bulacan" },
  { id: "cavite", name: "Cavite Branch", address: "Dasmariñas, Cavite" },
  { id: "laguna", name: "Laguna Branch", address: "Cabuyao, Laguna" },
  { id: "bataan", name: "Bataan Branch", address: "Balanga, Bataan" },
  { id: "pangasinan", name: "Pangasinan Branch", address: "Dagupan, Pangasinan" },
  { id: "ilocos", name: "Ilocos Branch", address: "San Fernando, La Union" },
];
