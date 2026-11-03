import { countTasksByScheduleWindow, taskMatchesScheduleWindow } from "./taskScheduleFilter";

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

test("schedule counters match the Today, Upcoming, and All dates windows in Manila", () => {
  const tasks = [
    { id: "today", scheduledDate: "2026-09-18", status: "in-progress" },
    { id: "future", scheduledDate: "2026-09-19", status: "pending" },
    { id: "past", scheduledDate: "2026-09-17", status: "pending" },
    { id: "completed-today", scheduledDate: "2026-09-17", completedAt: "2026-09-18T08:30:00.000Z", status: "completed" },
  ];
  expect(countTasksByScheduleWindow(tasks, "2026-09-18")).toEqual({ today: 2, upcoming: 1, all: 4 });
  expect(countTasksByScheduleWindow(tasks.filter((task) => task.status === "pending"), "2026-09-18"))
    .toEqual({ today: 0, upcoming: 1, all: 2 });
});
