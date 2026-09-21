import { sortTechnicianWorkOrders } from "./technicianWorkOrderSort";
import { normalizeTaskCollection } from "./technicianTaskCollection";

describe("technician work-order ordering", () => {
  test("keeps the latest work-order activity first regardless of status", () => {
    const source = [
      { id: "completed-old", status: "Completed", completedAt: "2026-09-16T09:00:00.000Z" },
      { id: "active", status: "In Progress", updatedAt: "2026-09-17T09:00:00.000Z" },
      { id: "completed-new", status: "Completed", completedAt: "2026-09-18T09:00:00.000Z" },
    ];
    const ordered = sortTechnicianWorkOrders(source);

    expect(ordered.map((task) => task.id)).toEqual(["completed-new", "active", "completed-old"]);
    expect(source.map((task) => task.id)).toEqual(["completed-old", "active", "completed-new"]);
  });

  test("uses the newest available activity marker and handles legacy records predictably", () => {
    const ordered = sortTechnicianWorkOrders([
      { id: "proof", status: "Installing", proof: { submittedAt: "2026-09-19T08:00:00.000Z" } },
      { id: "updated", status: "In Progress", updatedAt: "2026-09-20T08:00:00.000Z" },
      { id: "legacy-old", status: "Pending", scheduledDate: "2026-09-21", timeSlot: "8:00 AM - 10:00 AM" },
      { id: "legacy-new", status: "Pending", scheduledDate: "2026-09-22", timeSlot: "8:00 AM - 10:00 AM" },
    ]);

    expect(ordered.map((task) => task.id)).toEqual(["updated", "proof", "legacy-new", "legacy-old"]);
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
