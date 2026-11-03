export const ampDueLabel = (daysUntilDue) => {
  if (daysUntilDue == null || !Number.isFinite(Number(daysUntilDue))) return "Date needs review";
  const days = Number(daysUntilDue);
  if (days < 0) return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
};
