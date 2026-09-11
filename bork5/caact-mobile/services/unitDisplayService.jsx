export function formatUnitHorsepower(unit = {}) {
  const rawValue = unit?.capacityHp ?? unit?.horsepower ?? "";
  const match = String(rawValue).match(/\d+(?:\.\d+)?/);
  const horsepower = match ? Number(match[0]) : 0;

  return Number.isFinite(horsepower) && horsepower > 0
    ? `${horsepower} HP`
    : "Not recorded";
}

function installedTime(unit = {}) {
  const timestamp = new Date(unit?.purchaseDate || unit?.installationDate || unit?.createdAt || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function displayName(unit = {}) {
  return String(unit?.unitName || [unit?.brand, unit?.model].filter(Boolean).join(" ") || "AC Unit").trim();
}

export function sortCustomerUnits(units = [], sortBy = "newest") {
  const copy = [...units];
  if (sortBy === "oldest") return copy.sort((left, right) => installedTime(left) - installedTime(right));
  if (sortBy === "name") return copy.sort((left, right) => displayName(left).localeCompare(displayName(right), "en", { sensitivity: "base" }));
  return copy.sort((left, right) => installedTime(right) - installedTime(left));
}

export function filterCustomerUnits(units = [], query = "") {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [...units];
  return units.filter((unit) => [
    unit?.unitName,
    unit?.brand,
    unit?.model,
    unit?.productSku,
    unit?.serialNumber,
    unit?.orderCode,
    unit?.serviceBranch,
    unit?.placementArea,
    unit?.installationEnvironment,
    unit?.status,
  ].some((value) => String(value || "").toLowerCase().includes(needle)));
}

export function formatUnitInstallationDate(unit = {}) {
  const raw = unit?.installationDate || unit?.createdAt || "";
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function formatUnitPurchaseDate(unit = {}) {
  const date = new Date(unit?.purchaseDate || "");
  if (!unit?.purchaseDate || Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
