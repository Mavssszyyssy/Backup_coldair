import React from "react";
import { AppState, Linking } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import OrderConfirmation from "../app/customer/order-confirmation/[id]";
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: (value) => value }) }));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
const mockParams = { id: "order123", payment: "returned" };
const mockGet = jest.fn();
const mockVerify = jest.fn();
const mockRetry = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace }), useLocalSearchParams: () => mockParams, usePathname: () => "/customer/order-confirmation/order123" }));
jest.mock("./orderStorage", () => ({ getOrderById: (...args) => mockGet(...args), verifyOrderPayment: (...args) => mockVerify(...args), retryOrderPayment: (...args) => mockRetry(...args) }));
const pending = { id: "order123", paymentProvider: "paymongo", paymentStatus: "pending" };
let resume;
let remove;
beforeEach(() => {
  jest.clearAllMocks();
  mockParams.payment = "returned";
  mockGet.mockResolvedValue(pending);
  mockVerify.mockResolvedValue(pending);
  remove = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => { resume = listener; return { remove }; });
});
afterEach(() => jest.restoreAllMocks());
test("returning from checkout stays pending until verification confirms an outcome", async () => {
  const view = await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Payment pending")).toBeTruthy());
  mockVerify.mockResolvedValue({ ...pending, paymentStatus: "paid" });
  await act(async () => resume("active"));
  await waitFor(() => expect(screen.getByText("Payment successful")).toBeTruthy());
  expect(screen.queryByText("Transaction Failed")).toBeNull();
  await view.unmount();
  expect(remove).toHaveBeenCalled();
});
test("cancel callback alone cannot mark a pending order as failed", async () => {
  mockParams.payment = "cancelled";
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Payment pending")).toBeTruthy());
  expect(screen.queryByText("Transaction Failed")).toBeNull();
});
test("cancel callback cannot override verified payment", async () => {
  mockParams.payment = "cancelled";
  mockVerify.mockResolvedValue({ ...pending, paymentStatus: "paid" });
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Payment successful")).toBeTruthy());
});
test("verification error does not show cached success; manual recheck recovers", async () => {
  mockGet.mockResolvedValue({ ...pending, paymentStatus: "paid" });
  mockVerify.mockRejectedValueOnce(new Error("offline"));
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Unable to confirm payment")).toBeTruthy());
  expect(screen.queryByText("Payment successful")).toBeNull();
  mockVerify.mockResolvedValue({ ...pending, paymentStatus: "paid" });
  await fireEvent.press(screen.getByText("Check payment status"));
  await waitFor(() => expect(screen.getByText("Payment successful")).toBeTruthy());
});
test("success query with unpaid order stays pending", async () => {
  mockParams.payment = "success";
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Payment pending")).toBeTruthy());
});
test("COD is received, not falsely marked paid", async () => {
  mockParams.payment = undefined;
  mockGet.mockResolvedValue({ id: "order123", paymentMethod: "cod", paymentStatus: "pending" });
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Order received")).toBeTruthy());
  expect(mockVerify).not.toHaveBeenCalled();
});

test("payment return also shows the order recipient, delivery address, method, and amount", async () => {
  const detailed = { ...pending, paymentMethod: "gcash", total: 23000, customerEmail: "customer@example.com", address: { name: "Delivery Recipient", phone: "09123456789", street: "123 Sample Street", barangay: "Malhacan", city: "Meycauayan", province: "Bulacan", region: "Central Luzon", postalCode: "3020" } };
  mockGet.mockResolvedValue(detailed);
  mockVerify.mockResolvedValue(detailed);
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Delivery Recipient\n09123456789\ncustomer@example.com")).toBeTruthy());
  expect(screen.getByText("123 Sample Street, Malhacan, Meycauayan, Bulacan, Central Luzon, 3020")).toBeTruthy();
  expect(screen.getByText("GCash")).toBeTruthy();
  expect(screen.getByText(/23,000/)).toBeTruthy();
});

test("a backed-out first GCash attempt still offers the same payment flow", async () => {
  const order = { ...pending, paymentMethod: "gcash", workflowStatus: "to_pay", paymentRetryCount: 1, paymongo: { checkoutSessionId: "checkout-1", checkoutUrl: "https://pay.example/gcash-retry" } };
  mockGet.mockResolvedValue(order);
  mockVerify.mockResolvedValue(order);
  mockRetry.mockResolvedValue("https://pay.example/gcash-retry");
  jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Complete payment")).toBeTruthy());
  await fireEvent.press(screen.getByText("Complete payment"));
  await waitFor(() => expect(mockRetry).toHaveBeenCalledWith("order123"));
  expect(Linking.openURL).toHaveBeenCalledWith("https://pay.example/gcash-retry");
});

test("the third unsuccessful GCash attempt blocks another payment session", async () => {
  const order = { ...pending, paymentMethod: "gcash", workflowStatus: "to_pay", paymentRetryCount: 3 };
  mockGet.mockResolvedValue(order);
  mockVerify.mockResolvedValue(order);
  await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Maximum payment attempts reached. You can no longer retry payment for this order.")).toBeTruthy());
  expect(screen.queryByText("Pay Again")).toBeNull();
});
