import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import TasksScreen from "../app/technician/tasks";

const mockCurrent = { id: "technician-1" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockCurrent }) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ language: "English", t: (value) => value }) }));
jest.mock("../services/liveRefresh", () => ({ startLiveRefresh: () => () => {} }));
jest.mock("../services/taskStorage", () => ({
  getTasksByTechnician: jest.fn().mockResolvedValue([]),
  TASK_STATUS: { PENDING: "Pending", COMPLETED: "Completed" },
}));
jest.mock("../components/technician/TechnicianScreen", () => {
  const { View } = require("react-native");
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }) => React.createElement(View, null, children),
    TechHero: () => null,
  };
});

test("date tabs and filter choices expose clear selected states", async () => {
  await render(<TasksScreen />);
  expect(screen.getByRole("tab", { name: "Today: 0" }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Upcoming: 0" }));
  expect(screen.getByRole("tab", { name: "Upcoming: 0" }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("tab", { name: "All dates: 0" }));
  expect(screen.getByRole("tab", { name: "All dates: 0" }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Open work order filters" }));
  expect(screen.getByRole("button", { name: "Any priority" }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Medium" }));
  expect(screen.getByRole("button", { name: "Medium" }).props.accessibilityState.selected).toBe(true);
});
