import { groupMaintenancePlans } from "./maintenancePlanHistory";
const row = (date, due, basis = "Saved basis") => ({ date, bestServicedBy: due, recommendedService: "regular_cleaning", recommendationBasis: basis });
test("groups consecutive identical saved plans without changing stored rows", () => {
  const rows = [row("2026-09-08T15:38:00Z", "2027-06-05"), row("2026-09-08T15:49:00Z", "2027-06-05"), row("2026-09-08T15:59:00Z", "2027-06-05"), row("2026-09-09", "2027-06-06")];
  const before = JSON.stringify(rows);
  const grouped = groupMaintenancePlans(rows);
  expect(grouped).toHaveLength(2);
  expect(grouped[0].bestServicedBy).toBe("2027-06-06");
  expect(grouped[1].assessmentCount).toBe(3);
  expect(JSON.stringify(rows)).toBe(before);
});
test("retains changed explanations and a later return to an earlier plan", () => {
  expect(groupMaintenancePlans([row("2026-09-01", "2027-06-05"), row("2026-09-02", "2027-06-06"), row("2026-09-03", "2027-06-05")])).toHaveLength(3);
  expect(groupMaintenancePlans([row("2026-09-01", "2027-06-05"), row("2026-09-02", "2027-06-05", "New evidence")])).toHaveLength(2);
});
