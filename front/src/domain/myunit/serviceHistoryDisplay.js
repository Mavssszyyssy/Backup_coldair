export const serviceLabel = (value) => ({
  regular_cleaning: "Regular cleaning", deep_cleaning: "Deep cleaning", installation: "Installation", repair: "Repair", inspection: "Inspection",
})[String(value || "").trim().toLowerCase()] || "Service type not recorded";

export const serviceDateLabel = (value) => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })
  : "Not recorded";

export const serviceDetails = (service = {}) => [service.findings || service.details, service.actionTaken].filter(Boolean).join(" · ") || "Detailed findings and actions were not recorded.";
export const servicePriceLabel = (service = {}) => typeof service.price === "number" && Number.isFinite(service.price)
  ? `₱${service.price.toLocaleString("en-PH")}` : "";
