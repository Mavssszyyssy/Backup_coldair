const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const scoreFrom = (value, scores, fallback = 0) => {
  const key = String(value || '').toLowerCase();
  return scores[key] ?? fallback;
};

/**
 * AMPERE-style estimate: next regular servicing window from technician inputs.
 * The estimate is recalculated after each installation or service registration.
 */
export function estimateNextServiceWindow(params = {}, previousPlan = null) {
  const {
    conditionRating = 'good',
    lastServiceDate,
    installationDate,
    usageHoursPerDay = 8,
    environmentDustLevel = 'moderate',
    occupancyLoad = 'normal',
    filterCondition = 'normal',
    coilCondition = 'normal',
    drainageCondition = 'clear',
    voltageStability = 'stable'
  } = params;

  const baseMonths = { excellent: 7, good: 5, fair: 3, poor: 2 }[conditionRating] || 4;
  const usagePenalty = Number(usageHoursPerDay) >= 18 ? 2 : Number(usageHoursPerDay) >= 12 ? 1 : Number(usageHoursPerDay) <= 4 ? -1 : 0;
  const environmentPenalty =
    scoreFrom(environmentDustLevel, { low: -1, moderate: 0, high: 1, severe: 2 }) +
    scoreFrom(occupancyLoad, { light: -1, normal: 0, heavy: 1 });
  const inspectionPenalty =
    scoreFrom(filterCondition, { clean: -1, normal: 0, dusty: 1, clogged: 2 }) +
    scoreFrom(coilCondition, { clean: -1, normal: 0, dusty: 1, iced: 2 }) +
    scoreFrom(drainageCondition, { clear: 0, slow: 1, blocked: 2 }) +
    scoreFrom(voltageStability, { stable: 0, fluctuating: 1, unstable: 2 });

  let monthsUntil = baseMonths - usagePenalty - environmentPenalty - inspectionPenalty;
  if (previousPlan?.nextServiceDate && lastServiceDate) {
    const previousTarget = new Date(previousPlan.nextServiceDate);
    const actualService = new Date(lastServiceDate);
    const daysEarly = Math.round((previousTarget.getTime() - actualService.getTime()) / 86400000);
    if (daysEarly > 30 && conditionRating !== 'excellent') monthsUntil -= 1;
    if (daysEarly < -30 && ['excellent', 'good'].includes(conditionRating)) monthsUntil += 1;
  }

  monthsUntil = clamp(Math.round(monthsUntil), 1, 8);
  const start = lastServiceDate || installationDate ? new Date(lastServiceDate || installationDate) : new Date();
  const target = new Date(start);
  target.setMonth(target.getMonth() + monthsUntil);
  const monthName = target.toLocaleString('en-US', { month: 'long' });
  const year = target.getFullYear();
  const week = Math.ceil(target.getDate() / 7);
  return {
    label: `${monthName} ${year}, Week ${week}`,
    monthsUntil,
    nextServiceDate: target.toISOString(),
    generatedAt: new Date().toISOString()
  };
}
