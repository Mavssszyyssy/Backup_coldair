export const formatUnitHorsepower = (unit = {}) => {
  const rawValue = unit?.capacityHp ?? unit?.horsepower ?? "";
  const match = String(rawValue).match(/\d+(?:\.\d+)?/);
  const horsepower = match ? Number(match[0]) : 0;

  return Number.isFinite(horsepower) && horsepower > 0
    ? `${horsepower} HP`
    : "Not recorded";
};

const unitInstalledTime = (unit = {}) => {
  const installedAt = unit?.purchaseDateRaw || unit?.purchaseDate || unit?.installationDateRaw || unit?.installationDate || unit?.createdAt || "";
  const timestamp = new Date(installedAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const unitName = (unit = {}) =>
  String(unit?.unitName || [unit?.brand, unit?.model].filter(Boolean).join(" ") || "AC Unit").trim();

export const sortCustomerUnits = (units = [], sortBy = "newest") => {
  const copy = [...units];
  if (sortBy === "oldest") {
    return copy.sort((left, right) => unitInstalledTime(left) - unitInstalledTime(right));
  }
  if (sortBy === "name") {
    return copy.sort((left, right) => unitName(left).localeCompare(unitName(right), "en", { sensitivity: "base" }));
  }
  return copy.sort((left, right) => unitInstalledTime(right) - unitInstalledTime(left));
};

export const filterCustomerUnits = (units = [], query = "") => {
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
};
