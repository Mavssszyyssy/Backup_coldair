import { taskMatchesScheduleWindow } from "./taskScheduleFilter";

test("Today keeps an installation completed today visible when its scheduled date differs", () => {
  expect(taskMatchesScheduleWindow({
    scheduledDate: "2026-09-19",
    completedAt: "2026-09-18T08:30:00.000Z",
    status: "Completed",
  }, "today", "2026-09-18")).toBe(true);
});

test("Today does not show future incomplete work", () => {
  expect(taskMatchesScheduleWindow({ scheduledDate: "2026-09-19", status: "Installing" }, "today", "2026-09-18")).toBe(false);
});
