import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import CustomerNotificationsScreen from "../app/customer/notifications";

const mockGetNotifications = jest.fn();
const mockMarkNotification = jest.fn();
const mockRouter = { back: jest.fn(), push: jest.fn() };
let mockLanguage = "Filipino";
const mockCurrent = { id: "customer-1" };
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockCurrent }) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({ t: (text) => require("./interfaceI18n").translateText(text, mockLanguage) }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/customer/notifications",
  useFocusEffect: (callback) => require("react").useEffect(callback, [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
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

test("customer alerts localize controls and preserve recorded notification content", async () => {
  mockLanguage = "Filipino";
  mockGetNotifications.mockResolvedValue([{ id: "alert-1", title: "Original technician note", message: "Kumakalas ang tubo", unread: true }]);
  await render(<CustomerNotificationsScreen />);
  expect(await screen.findByText("Original technician note")).toBeTruthy();
  expect(screen.getByText("Kumakalas ang tubo")).toBeTruthy();
  expect(screen.getByText("Markahan na nabasa ang lahat")).toBeTruthy();
  expect(screen.getByText("Bago")).toBeTruthy();
});

test("repeated customer alert taps mark and navigate only once", async () => {
  mockLanguage = "English";
  mockRouter.push.mockClear();
  mockMarkNotification.mockReset().mockResolvedValue({});
  mockGetNotifications.mockResolvedValue([
    { id: "alert-2", title: "Order update", message: "Ready", unread: true, route: "/customer/orders" },
    { id: "alert-3", title: "Previous update", message: "Done", read: true },
  ]);
  await render(<CustomerNotificationsScreen />);
  expect(await screen.findByText("Order update")).toBeTruthy();
  expect(screen.getByText("New")).toBeTruthy();
  expect(screen.getByText("Earlier")).toBeTruthy();
  const alert = screen.getByRole("button", { name: "Order update. Open alert" });
  fireEvent.press(alert);
  fireEvent.press(alert);
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledTimes(1));
  expect(mockMarkNotification).toHaveBeenCalledTimes(1);
});
