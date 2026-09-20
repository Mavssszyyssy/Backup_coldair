import { sortTechnicianWorkOrders } from "./technicianWorkOrderSort";
import { normalizeTaskCollection } from "./technicianTaskCollection";

describe("technician work-order ordering", () => {
  test("keeps active work first and completed work newest first", () => {
    const ordered = sortTechnicianWorkOrders([
      { id: "completed-old", status: "Completed", completedAt: "2026-09-16T09:00:00.000Z" },
      { id: "active", status: "In Progress", scheduledDate: "2026-09-20" },
      { id: "completed-new", status: "Completed", completedAt: "2026-09-18T09:00:00.000Z" },
    ]);

    expect(ordered.map((task) => task.id)).toEqual(["active", "completed-new", "completed-old"]);
  });
});

describe("technician work-order collection", () => {
  test("keeps the newest authoritative copy when completion refreshes a cached task", () => {
    const tasks = normalizeTaskCollection([
      { id: "task-1", taskCode: "TSK-1", status: "Installing", updatedAt: "2026-09-18T08:00:00.000Z" },
      { id: "task-1", taskCode: "TSK-1", status: "Completed", completedAt: "2026-09-18T09:00:00.000Z", updatedAt: "2026-09-18T09:00:00.000Z" },
    ], (task) => task);

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: "task-1", status: "Completed" });
  });
});
