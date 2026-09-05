import { getUnitVisitCheckIn } from "./customerHistoryLogic";

const previous = { id: "old", status: "completed", checkIn: { checkedInAt: "2026-09-05T01:00:00Z" } };
test("a submitted request without an assignment cannot inherit the previous arrival", () => {
  expect(getUnitVisitCheckIn([{ id: "request", status: "Submitted" }], [previous])).toEqual({ hasCurrentVisit: true, record: null });
});
test("a newly assigned technician is not shown as arrived because of another task", () => {
  expect(getUnitVisitCheckIn([{ id: "request", linkedTaskId: "new", status: "In Progress" }], [previous, { id: "new", status: "in-progress" }]).record).toBeNull();
});
test("the current request uses its own check-in and completed visits remain labelled as history", () => {
  const current = { id: "new", requestId: "request", status: "in-progress", checkIn: { checkedInAt: "2026-09-06T01:00:00Z" } };
  const selected = getUnitVisitCheckIn([{ id: "request", status: "Assigned" }], [previous, current]);
  expect(selected.hasCurrentVisit).toBe(true);
  expect(selected.record.task.id).toBe("new");
  expect(getUnitVisitCheckIn([], [previous])).toEqual({ hasCurrentVisit: false, record: { task: previous, checkIn: previous.checkIn } });
});
