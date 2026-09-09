// Group consecutive, unchanged assessments for display only. The saved visits
// remain intact; a changed plan (including a return to an older plan) gets a page.
export function groupMaintenancePlans(rows = []) {
  const sorted = [...rows].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const groups = [];
  for (const row of sorted) {
    const signature = JSON.stringify([String(row.bestServicedBy || "").slice(0, 10), row.recommendedService || "", row.recommendationBasis || ""]);
    const previous = groups[groups.length - 1];
    if (previous?.signature === signature) {
      previous.assessmentCount += 1;
      previous.firstCalculatedAt = row.date;
    } else {
      groups.push({ ...row, signature, assessmentCount: 1, firstCalculatedAt: row.date });
    }
  }
  return groups;
}
