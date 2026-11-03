import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TechDashboard from "../app/technician/dashboard";
import { getTasksByTechnician } from "./taskStorage";

const mockPush = jest.fn();
const mockCurrent = { id: "tech-1", alias: "tech.one" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));
jest.mock("../context/UserContext", () => ({
  useUserContext: () => ({ current: mockCurrent }),
}));
jest.mock("../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({ t: (value) => value }),
}));
jest.mock("../services/liveRefresh", () => ({ startLiveRefresh: () => () => {} }));
jest.mock("../services/taskStorage", () => ({
  getTasksByTechnician: jest.fn().mockResolvedValue([]),
  getTaskStats: () => ({ inProgress: 2, pending: 3, completed: 4, total: 10 }),
}));
jest.mock("../components/technician/TechnicianScreen", () => {
  const { View } = require("react-native");
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }) => React.createElement(View, null, children),
    TechHero: ({ children }) => React.createElement(View, null, children),
  };
});

test("dashboard summary cards open their matching all-date work-order filters", async () => {
  await render(<TechDashboard />);
  await waitFor(() => expect(screen.getByRole("button", { name: "In progress: 2" })).toBeTruthy());
  for (const [label, status] of [["In progress: 2", "in-progress"], ["Pending: 3", "pending"], ["Completed: 4", "completed"], ["All work orders: 10", "all"]]) {
    await fireEvent.press(screen.getByRole("button", { name: label }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/technician/tasks", params: { status, schedule: "all" } });
  }
});

test("dashboard separates notifications and shows readable work-order statuses", async () => {
  getTasksByTechnician.mockResolvedValueOnce([
    { id: "job-1", title: "Repair A", status: "In Progress", customerName: "Customer One" },
    { id: "job-2", title: "Repair B", status: "On Hold", customerName: "Customer Two" },
  ]);
  await render(<TechDashboard />);
  await waitFor(() => expect(screen.getByText("Repair A")).toBeTruthy());
  expect(screen.getByText("Notifications")).toBeTruthy();
  expect(screen.getByText("Work order summary")).toBeTruthy();
  expect(screen.getByText("Recent work orders")).toBeTruthy();
  expect(screen.getByText("In Progress")).toBeTruthy();
  expect(screen.getByText("On hold")).toBeTruthy();
});
