import { describe, expect, test } from "vitest";
import {
  scheduleSlotsOverlap,
  taskIncludesTechnician,
  technicianHasConflict,
} from "./scheduleConflicts";

const tasks = [{
  id: "task-1",
  status: "in-progress",
  scheduledDate: "2026-09-20",
  timeSlot: "9:00 AM - 11:00 AM",
  assignedTechnicianId: "leader",
  schedule: { teamMemberIds: ["support"] },
}];

describe("technician schedule conflict checks", () => {
  test("overlapping slots block both the leader and support team", () => {
    expect(taskIncludesTechnician(tasks[0], "leader")).toBe(true);
    expect(taskIncludesTechnician(tasks[0], "support")).toBe(true);
    expect(technicianHasConflict(tasks, { technicianId: "support", scheduledDate: "2026-09-20", timeSlot: "10:00 AM - 12:00 PM" })).toBe(true);
  });

  test("adjacent, different-day, terminal, and current work remain available", () => {
    expect(scheduleSlotsOverlap("9:00 AM - 11:00 AM", "11:00 AM - 1:00 PM")).toBe(false);
    expect(technicianHasConflict(tasks, { technicianId: "leader", scheduledDate: "2026-09-21", timeSlot: "10:00 AM - 12:00 PM" })).toBe(false);
    expect(technicianHasConflict([{ ...tasks[0], status: "completed" }], { technicianId: "leader", scheduledDate: "2026-09-20", timeSlot: "10:00 AM - 12:00 PM" })).toBe(false);
    expect(technicianHasConflict(tasks, { technicianId: "leader", scheduledDate: "2026-09-20", timeSlot: "10:00 AM - 12:00 PM", excludeTaskId: "task-1" })).toBe(false);
  });
});
