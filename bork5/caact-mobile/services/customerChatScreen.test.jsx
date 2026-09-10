import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerChatScreen from "../app/customer/chat";

const mockPush = jest.fn();
const mockGetToken = jest.fn();
const mockSend = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
}));
jest.mock("../components/customer/CustomerScreen", () => ({ children }) => <>{children}</>);
jest.mock("./api", () => ({
  getStoredToken: (...args) => mockGetToken(...args),
  sendCustomerChatMessage: (...args) => mockSend(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue("customer-token");
  mockSend.mockResolvedValue({
    success: true,
    provider: "openai",
    reply: { text: "Open My Orders and choose Pay Again.", route: "/my-orders" },
  });
});

test("mobile customer chat sends the question to AI and maps its page action", async () => {
  await render(<CustomerChatScreen />);
  await fireEvent.press(screen.getByText("Where can I track my order?"));

  await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByText("Open My Orders and choose Pay Again.")).toBeTruthy());
  expect(mockSend).toHaveBeenCalledWith("customer-token", expect.objectContaining({
    message: "Where can I track my order?",
    currentPage: "/customer/chat",
  }));
  fireEvent.press(screen.getByText("Open page"));
  expect(mockPush).toHaveBeenCalledWith("/customer/orders");
});
