import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerOrdersScreen from "../app/customer/orders";

const mockGetOrderPage = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useRouter: () => ({ push: jest.fn() }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect) => React.useEffect(effect, [effect]),
  };
});
jest.mock("./liveRefresh", () => ({
  startLiveRefresh: (load) => { void load({ background: false }); return () => {}; },
}));
jest.mock("./orderStorage", () => ({
  getOrderPage: (...args) => mockGetOrderPage(...args),
  getOrderById: jest.fn(),
  requestOrderCancellation: jest.fn(),
  retryOrderPayment: jest.fn(),
}));
jest.mock("./ecommerceService", () => ({ formatPeso: (value) => `₱${value}` }));
jest.mock("./cartDisplayService", () => ({ formatCartModel: () => "Test model" }));
jest.mock("../hooks/useInterfaceLanguage", () => ({
  useInterfaceLanguage: () => ({ language: "English", t: (value) => value }),
}));
jest.mock("../components/boutique", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return {
    BQ_COLORS: { accent: "blue", bgAlt: "white", brand: "blue", danger: "red", inkFaint: "gray", inkMuted: "gray", success: "green", warning: "orange" },
    BQ_SPACING: { xs: 4, sm: 8, md: 14, xl: 30 },
    BoutiqueText: ({ children }) => React.createElement(Text, null, children),
    BoutiqueCard: ({ children }) => React.createElement(View, null, children),
    BoutiqueScreen: ({ children }) => React.createElement(View, null, children),
    BoutiqueHeader: ({ title }) => React.createElement(Text, null, title),
    BoutiqueSearchInput: ({ value, onChangeText, placeholder }) => React.createElement(require("react-native").TextInput, { value, onChangeText, placeholder }),
    BoutiqueSegmented: ({ options, value, onChange }) => React.createElement(View, null, options.map((option) => React.createElement(Pressable, { key: option.value, onPress: () => onChange(option.value), accessibilityRole: "button", accessibilityState: { selected: value === option.value } }, React.createElement(Text, null, option.label)))),
    BoutiqueChip: ({ label, variant }) => React.createElement(Text, null, `${label} (${variant})`),
    BoutiqueButton: ({ title, onPress }) => React.createElement(Pressable, { onPress, accessibilityRole: "button", accessibilityLabel: title }, React.createElement(Text, null, title)),
  };
});

const order = (overrides = {}) => ({
  id: "order-1", items: [], total: 100, workflowStatus: "to_pay", paymentMethod: "gcash",
  paymentStatus: "failed", deliveryStatus: "pending", ...overrides,
});
const page = (orders) => ({ orders, pagination: { total: orders.length, totalPages: 1 } });

test("Orders shows loading before the first page resolves, then separate status indicators", async () => {
  let resolvePage;
  mockGetOrderPage.mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }));
  await render(<CustomerOrdersScreen />);
  expect(screen.getByText("Loading orders...")).toBeTruthy();
  expect(screen.queryByText("No orders yet")).toBeNull();

  await act(async () => { resolvePage(page([order()])); });
  await waitFor(() => expect(screen.getByText("Awaiting approval (warning)")).toBeTruthy());
  expect(screen.getByText("Payment failed (danger)")).toBeTruthy();
  expect(screen.getByText("Showing 1–1 of 1 matching order")).toBeTruthy();
  expect(screen.queryByText("Loading orders...")).toBeNull();
});

test("completed and paid orders show success status indicators", async () => {
  mockGetOrderPage.mockResolvedValueOnce(page([order({ workflowStatus: "complete", paymentStatus: "paid" })]));
  await render(<CustomerOrdersScreen />);
  await waitFor(() => expect(screen.getByText("Completed (success)")).toBeTruthy());
  expect(screen.getByText("Paid (success)")).toBeTruthy();
});

test("an installation still in progress is not shown as completed by its legacy status", async () => {
  mockGetOrderPage.mockResolvedValueOnce(page([order({ workflowStatus: "to_install", status: "released", paymentStatus: "paid" })]));
  await render(<CustomerOrdersScreen />);
  await waitFor(() => expect(screen.getByText("Installation in progress (blue)")).toBeTruthy());
});

test("order, payment, and date filters stay in sync with the latest orders request", async () => {
  mockGetOrderPage.mockResolvedValue(page([order({ id: "12345678", workflowStatus: "to_deliver", paymentStatus: "paid" })]));
  await render(<CustomerOrdersScreen />);

  await fireEvent.press(screen.getByRole("button", { name: "To deliver" }));
  await fireEvent.press(screen.getByRole("button", { name: "Paid" }));
  await fireEvent.press(screen.getByRole("button", { name: "Last 30 days" }));

  await waitFor(() => expect(mockGetOrderPage).toHaveBeenLastCalledWith(1, 10, {
    search: "", orderStatus: "to_deliver", paymentStatus: "paid", dateRange: "30d",
  }));
  await waitFor(() => expect(screen.getByText("Order #12345678")).toBeTruthy());
});

test("a slower response for an older filter cannot replace the latest order results", async () => {
  const pending = [];
  mockGetOrderPage.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
  await render(<CustomerOrdersScreen />);
  await waitFor(() => expect(pending).toHaveLength(1));

  await fireEvent.press(screen.getByRole("button", { name: "To deliver" }));
  await waitFor(() => expect(pending).toHaveLength(2));

  await act(async () => pending[1](page([order({ id: "1234ABCD", workflowStatus: "to_deliver" })])));
  await waitFor(() => expect(screen.getByText("Order #1234ABCD")).toBeTruthy());
  await act(async () => pending[0](page([order({ id: "8765WXYZ" })])));

  expect(screen.getByText("Order #1234ABCD")).toBeTruthy();
  expect(screen.queryByText("Order #8765WXYZ")).toBeNull();
});
