const postalCodeRules = require("./postalCodeRules.json");

const normalize = (value) => String(value || "").trim().toLowerCase();
const normalizedPostalCodeRules = Object.fromEntries(
  Object.entries(postalCodeRules).map(([key, value]) => [key.toLowerCase(), value]),
);
const keyFor = ({ region, province, city }) => [region, province, city].map(normalize).join("|");

const getPostalCodeRules = (address = {}) => normalizedPostalCodeRules[keyFor(address)] || [];
const matchesRule = (value, rule) => {
  if (/^\d{4}-\d{4}$/.test(rule)) {
    const [start, end] = rule.split("-").map(Number);
    const number = Number(value);
    return number >= start && number <= end;
  }
  return value === rule;
};

const validatePostalCodeForAddress = (address = {}) => {
  const postalCode = String(address.postalCode || "").trim();
  if (!postalCode) return "";
  if (!/^\d{4}$/.test(postalCode)) return "Postal code must be exactly 4 digits";
  const rules = getPostalCodeRules(address);
  if (!rules.length || rules.some((rule) => matchesRule(postalCode, rule))) return "";
  return `Postal code does not match ${address.city || "the selected city"}`;
};

module.exports = { getPostalCodeRules, validatePostalCodeForAddress };
