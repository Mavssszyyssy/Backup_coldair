import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import TechnicianNotificationsScreen from "../app/technician/notifications";

const mockGetNotifications = jest.fn();
const mockMarkNotification = jest.fn();
const mockArchiveAll = jest.fn();
const mockRestore = jest.fn();
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
  archiveAllNotificationsForUser: (...args) => mockArchiveAll(...args),
  restoreNotificationForUser: (...args) => mockRestore(...args),
  markNotificationsReadForUser: jest.fn(),
  markNotificationRead: (...args) => mockMarkNotification(...args),
}));

test("technician alerts group entries and ignore duplicate taps", async () => {
  mockRouter.push.mockClear();
  let finishRead;
  mockMarkNotification.mockReset().mockImplementation(() => new Promise((resolve) => { finishRead = resolve; }));
  mockGetNotifications.mockResolvedValue([
    { id: "alert-1", title: "Assignment", message: "Visit today", unread: true, route: "/technician/tasks" },
    { id: "alert-2", title: "Previous assignment", message: "Finished", read: true },
  ]);
  await render(<TechnicianNotificationsScreen />);
  expect(await screen.findByText("Assignment")).toBeTruthy();
  expect(screen.getByText("New")).toBeTruthy();
  expect(screen.getByText("Earlier")).toBeTruthy();
  const alert = screen.getByRole("button", { name: "Assignment. Open alert" });
  await fireEvent.press(alert);
  await fireEvent.press(alert);
  await act(async () => finishRead({}));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  expect(mockMarkNotification).toHaveBeenCalledTimes(1);
});

test("archive all confirms once, keeps navigation in Alerts, and allows restore from Archived", async () => {
  const item = { id: "alert-1", title: "Assignment", unread: true, route: "/technician/tasks" };
  const dialog = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockRouter.push.mockClear();
  mockGetNotifications.mockImplementation(async (_user, { archivePage }) => ({
    items: [archivePage ? { ...item, unread: false, read: true } : item],
  }));
  mockArchiveAll.mockResolvedValue(undefined);
  mockRestore.mockResolvedValue(undefined);
  try {
    await render(<TechnicianNotificationsScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Archive all" }));
    expect(mockArchiveAll).not.toHaveBeenCalled();
    const confirm = dialog.mock.calls[0][2][1].onPress;
    await act(async () => { await Promise.all([confirm(), confirm()]); });
    expect(await screen.findByText("You are all caught up.")).toBeTruthy();
    expect(mockArchiveAll).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("tab", { name: "Archived" }));
    const row = await screen.findByRole("button", { name: "Assignment. Open alert" });
    expect(screen.queryByRole("button", { name: "Restore: Assignment" })).toBeNull();
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "moveAlert" } });
    expect(await screen.findByText("No archived alerts.")).toBeTruthy();
    expect(mockRestore).toHaveBeenCalledWith(item.id);
    expect(mockRouter.push).not.toHaveBeenCalled();
  } finally { dialog.mockRestore(); }
});
