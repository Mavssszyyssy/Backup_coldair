import postalCodeRules from './postalCodeRules.json';

const normalize = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\b(city|municipality|province)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();
const normalizedPostalCodeRules = Object.fromEntries(
  Object.entries(postalCodeRules).map(([key, value]) => [key.toLowerCase(), value]),
);
const normalizeRegion = (value) => {
  const text = normalize(value);
  if (text.includes('ncr') || text.includes('national capital') || text.includes('metro manila')) return 'ncr';
  if (text.includes('calabarzon') || text.includes('iv a')) return 'calabarzon';
  if (text.includes('central luzon')) return 'central luzon';
  if (text.includes('ilocos')) return 'ilocos region';
  return text;
};
const keyFor = ({ region, province, city }) => [normalizeRegion(region), normalize(province), normalize(city)].join('|');

export const getPostalCodeRules = (address = {}) => {
  const exact = normalizedPostalCodeRules[keyFor(address)];
  if (exact) return exact;
  const key = keyFor(address);
  const match = Object.entries(postalCodeRules).find(([candidate]) => candidate.toLowerCase() === key);
  return match ? match[1] : [];
};

const matchesRule = (value, rule) => {
  if (/^\d{4}-\d{4}$/.test(rule)) {
    const [start, end] = rule.split('-').map(Number);
    const number = Number(value);
    return number >= start && number <= end;
  }
  return value === rule;
};

export const validatePostalCodeForAddress = (address = {}) => {
  const postalCode = String(address.postalCode || '').trim();
  if (!postalCode) return '';
  if (!/^\d{4}$/.test(postalCode)) return 'Postal code must be exactly 4 digits.';
  const rules = getPostalCodeRules(address);
  if (!rules.length) return '';
  if (rules.some((rule) => matchesRule(postalCode, rule))) return '';
  return `Postal code does not match ${address.city || 'the selected city'}.`;
};
