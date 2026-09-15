import { normalizeTask } from "./taskStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

test("technician task normalization keeps the live daily schedule fields", () => {
  const task = normalizeTask({
    id: "task-1",
    assignedTechnicianId: "tech-1",
    scheduledDate: "2026-09-16",
    timeSlot: "9:00 AM - 12:00 PM",
    branch: "Cavite",
    schedule: { driverName: "Driver One", teamMemberIds: ["tech-2"], teamMemberNames: ["Tech Two"], notes: "Bring ladder" },
    scheduleDetails: { category: "installation", paymentMethod: "GCash", paymentStatus: "paid" },
  });
  expect(task).toMatchObject({
    scheduledDate: "2026-09-16",
    timeSlot: "9:00 AM - 12:00 PM",
    branch: "Cavite",
    schedule: { driverName: "Driver One", teamMemberIds: ["tech-2"], teamMemberNames: ["Tech Two"], notes: "Bring ladder" },
    scheduleDetails: { category: "installation", paymentMethod: "GCash", paymentStatus: "paid" },
  });
});
