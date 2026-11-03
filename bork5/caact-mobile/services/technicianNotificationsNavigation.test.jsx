import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import TechnicianNotificationsScreen from "../app/technician/notifications";

const mockGetNotifications = jest.fn();
const mockMarkNotification = jest.fn();
const mockRouter = { push: jest.fn() };
const mockCurrent = { id: "technician-1" };
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockCurrent }) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: (value) => value }) }));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));
jest.mock("../components/technician/TechnicianScreen", () => ({ children }) => require("react").createElement(require("react-native").View, null, children));
jest.mock("./liveRefresh", () => ({
  startLiveRefresh: (load) => {
    load({ background: false, isCurrent: () => true });
    return () => {};
  },
}));
jest.mock("./notificationService", () => ({
  getNotificationsForUser: (...args) => mockGetNotifications(...args),
  markNotificationsReadForUser: jest.fn(),
  markNotificationRead: (...args) => mockMarkNotification(...args),
}));

test("technician alerts group entries and ignore duplicate taps", async () => {
  mockRouter.push.mockClear();
  mockMarkNotification.mockReset().mockResolvedValue({});
  mockGetNotifications.mockResolvedValue([
    { id: "alert-1", title: "Assignment", message: "Visit today", unread: true, route: "/technician/tasks" },
    { id: "alert-2", title: "Previous assignment", message: "Finished", read: true },
  ]);
  await render(<TechnicianNotificationsScreen />);
  expect(await screen.findByText("Assignment")).toBeTruthy();
  expect(screen.getByText("New")).toBeTruthy();
  expect(screen.getByText("Earlier")).toBeTruthy();
  const alert = screen.getByRole("button", { name: "Assignment. Open alert" });
  fireEvent.press(alert);
  fireEvent.press(alert);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  expect(mockMarkNotification).toHaveBeenCalledTimes(1);
});
