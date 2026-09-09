const keys = ['laborCost', 'partsCost', 'additionalCost'];
const amount = value => value === null || value === undefined || value === '' ? null : Number(value);
function serviceCosts(source = {}) {
  const result = Object.fromEntries(keys.map(key => { const n = amount(source[key]); return [key, Number.isFinite(n) && n >= 0 ? n : null]; }));
  const recorded = Object.values(result).filter(value => value !== null);
  return { ...result, totalServiceCost: recorded.length ? Math.round(recorded.reduce((a, b) => a + b, 0) * 100) / 100 : null };
}
function validateServiceCosts(payload = {}) {
  if (Array.isArray(payload.serviceLogs)) {
    for (const log of payload.serviceLogs) {
      if (!log || typeof log !== 'object' || Array.isArray(log)) return 'Service notes must be valid records.';
      const error = validateServiceCosts({ laborCost: log.laborCost ?? null, partsCost: log.partsCost ?? null });
      if (error) return error;
    }
    for (const key of ['laborCost', 'partsCost']) {
      const recorded = payload.serviceLogs.map(log => amount(log[key])).filter(value => value !== null);
      payload[key] = recorded.length ? Math.round(recorded.reduce((sum, value) => sum + value, 0) * 100) / 100 : null;
    }
  }
  for (const key of keys) {
    if (!Object.hasOwn(payload, key)) continue;
    const raw = payload[key];
    if (raw === null || raw === '') { payload[key] = null; continue; }
    const n = Number(raw);
    if (!['string', 'number'].includes(typeof raw) || !String(raw).trim() || !Number.isFinite(n) || n < 0 || n > 1000000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.000001) return 'Recorded costs must be non-negative PHP amounts with at most two decimals.';
    payload[key] = n;
  }
  delete payload.totalServiceCost; // Never accept a caller-calculated total.
  return '';
}
module.exports = { serviceCosts, validateServiceCosts };
