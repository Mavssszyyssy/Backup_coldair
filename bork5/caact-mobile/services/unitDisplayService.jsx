export function formatUnitHorsepower(unit = {}) {
  const rawValue = unit?.capacityHp ?? unit?.horsepower ?? "";
  const match = String(rawValue).match(/\d+(?:\.\d+)?/);
  const horsepower = match ? Number(match[0]) : 0;

  return Number.isFinite(horsepower) && horsepower > 0
    ? `${horsepower} HP`
    : "Not recorded";
}
