import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import CustomerChatScreen from "../app/customer/chat";
import { useInterfaceLanguage } from "../hooks/useInterfaceLanguage";
import { translateText } from "./interfaceI18n";

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
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  useInterfaceLanguage.mockReturnValue({ t: (value) => value });
  mockGetToken.mockResolvedValue("customer-token");
  mockSend.mockResolvedValue({
    success: true,
    provider: "openai",
    reply: { text: "Open My Orders and choose Pay Again.", route: "/my-orders" },
  });
});

test("chat switches static prompts while keeping the original question and AI response", async () => {
  useInterfaceLanguage.mockReturnValue({ t: (value) => translateText(value, "Filipino") });
  await render(<CustomerChatScreen />);
  await fireEvent.press(screen.getByText("Saan ko masusubaybayan ang aking order?"));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith("customer-token", expect.objectContaining({
    message: "Where can I track my order?",
  })));
  expect(screen.getByText("Open My Orders and choose Pay Again.")).toBeTruthy();
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

test("mobile customer chat keeps quick questions compact instead of stretching vertically", async () => {
  await render(<CustomerChatScreen />);

  const quickList = screen.getByTestId("quick-question-list");
  expect(StyleSheet.flatten(quickList.props.style)).toEqual(expect.objectContaining({
    flexGrow: 0,
    flexShrink: 0,
  }));
  expect(screen.getByText("Quick questions")).toBeTruthy();
});

test("mobile stock shortcut shows the catalogue reply and opens Shop", async () => {
  useInterfaceLanguage.mockReturnValue({ language: "Filipino", t: (value) => translateText(value, "Filipino") });
  mockSend.mockResolvedValueOnce({ success: true, provider: "catalog", reply: { text: "May 8 available na unit sa Cavite.", route: "/shop" } });
  await render(<CustomerChatScreen />);
  await fireEvent.press(screen.getByText("Aling branch ang may pinakamaraming stock ng aircon?"));
  expect(await screen.findByText("May 8 available na unit sa Cavite.")).toBeTruthy();
  expect(mockSend).toHaveBeenCalledWith("customer-token", expect.objectContaining({ message: "Which branch has the most AC stock?", language: "Filipino" }));
  await fireEvent.press(screen.getByText("Buksan ang pahina"));
  expect(mockPush).toHaveBeenCalledWith("/customer/shop");
});

test("mobile chat preserves conversation context for a short product follow-up", async () => {
  mockSend.mockResolvedValueOnce({
    success: true, provider: "catalog", reply: { text: "Available AC options. What is your budget?", route: "/shop" },
  });
  await render(<CustomerChatScreen />);
  const input = screen.getByLabelText("Message AEROPULSE assistant");
  await fireEvent.changeText(input, "What is the best seller AC unit?");
  await fireEvent.press(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Available AC options. What is your budget?");
  await fireEvent.changeText(input, "What about under 30k?");
  await fireEvent.press(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(2));
  expect(mockSend.mock.lastCall[1]).toEqual(expect.objectContaining({
    message: "What about under 30k?",
    history: [
      { role: "user", content: "What is the best seller AC unit?" },
      { role: "assistant", content: "Available AC options. What is your budget?" },
    ],
  }));
});
