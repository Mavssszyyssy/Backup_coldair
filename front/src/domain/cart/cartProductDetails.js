export const formatCartModel = (item = {}) =>
  String(item?.model || item?.sku || item?.productSku || "").trim() || "Not specified";

export const formatCartHorsepower = (item = {}) => {
  const rawValue = item?.horsepower ?? item?.capacityHp ?? item?.specs ?? "";
  const match = String(rawValue).match(/\d+(?:\.\d+)?/);
  const horsepower = match ? Number(match[0]) : 0;

  return Number.isFinite(horsepower) && horsepower > 0
    ? `${horsepower} HP`
    : "Not specified";
};
