import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import LogSelectScreen from "../app/technician/task/[id]/unit/log/select";

const mockHistory = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "task-current" }),
  useFocusEffect: (callback) => require("react").useEffect(callback, []),
}));
jest.mock("./taskStorage", () => ({ TASK_STATUS: { IN_PROGRESS: "In Progress" }, getTaskById: jest.fn().mockResolvedValue({ id: "task-current", status: "In Progress", requestId: "request", title: "Maintenance", unit: { serialNumber: "CAA-001" } }) }));
jest.mock("./unitServiceLogStorage", () => ({ LOG_TYPES: [], getServiceLogsByTask: jest.fn().mockResolvedValue([]) }));
jest.mock("./api", () => ({ getStoredToken: jest.fn().mockResolvedValue("qa-session-placeholder"), fetchTechnicianUnitHistory: (...args) => mockHistory(...args) }));

test("prior unit visits remain visible when the current work order has no notes", async () => {
  mockHistory.mockResolvedValue({ success: true, unit: { serialNumber: "CAA-001" }, maintenanceHistory: [{ id: "previous", date: "2026-09-05", serviceType: "deep_cleaning", findings: "Coil contained heavy dust.", actionTaken: "Removed and cleaned the coil." }] });
  await render(<LogSelectScreen />);
  await screen.findByText("No notes for this work order yet");
  await fireEvent.press(screen.getByLabelText("AC unit history"));
  await screen.findByText("Verified AC Unit");
  expect(screen.queryByText("Coil contained heavy dust.")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Choose history section"));
  await fireEvent.press(screen.getByLabelText("AC history: Maintenance"));
  await screen.findByText("Coil contained heavy dust.");
  expect(screen.getByText("Removed and cleaned the coil.")).toBeTruthy();
  expect(screen.queryByText("No notes for this work order yet")).toBeNull();
  expect(mockHistory).toHaveBeenCalledWith("qa-session-placeholder", "CAA-001", "task-current");
});

test("a history loading error is not presented as an empty history", async () => {
  mockHistory.mockResolvedValue({ success: false, error: "Unable to load unit history." });
  await render(<LogSelectScreen />);
  await screen.findByText("Unable to load unit history.");
  expect(screen.queryByText("No notes for this work order yet")).toBeNull();
});
