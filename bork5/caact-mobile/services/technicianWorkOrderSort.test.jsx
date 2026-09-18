import { sortTechnicianWorkOrders } from "./technicianWorkOrderSort";

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
