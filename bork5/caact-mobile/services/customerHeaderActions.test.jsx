import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CustomerHeaderActions from "../components/customer/CustomerHeaderActions";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../components/NotificationBadge", () => () => null);

beforeEach(() => jest.clearAllMocks());

test("Chat Support is beside Notifications and each opens its existing route", async () => {
  const view = await render(<CustomerHeaderActions />);
  const chat = view.getByRole("button", { name: "Chat Support" });
  const notifications = view.getByRole("button", { name: "Notifications" });
  expect(chat.parent).toBe(notifications.parent);
  await fireEvent.press(chat);
  expect(mockPush).toHaveBeenCalledWith("/customer/chat");
  await fireEvent.press(notifications);
  expect(mockPush).toHaveBeenCalledWith("/customer/notifications");
});
