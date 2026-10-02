import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CustomerHeaderActions from "../components/customer/CustomerHeaderActions";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../components/NotificationBadge", () => () => null);

beforeEach(() => jest.clearAllMocks());

test("Chat Support is beside Alerts and each opens its existing route", async () => {
  const view = await render(<CustomerHeaderActions />);
  const chat = view.getByRole("button", { name: "Chat Support" });
  const alerts = view.getByRole("button", { name: "Alerts" });
  expect(chat.parent).toBe(alerts.parent);
  await fireEvent.press(chat);
  expect(mockPush).toHaveBeenCalledWith("/customer/chat");
  await fireEvent.press(alerts);
  expect(mockPush).toHaveBeenCalledWith("/customer/notifications");
});
