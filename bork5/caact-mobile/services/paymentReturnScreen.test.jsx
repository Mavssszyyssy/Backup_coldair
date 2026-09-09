import React from "react";
import { AppState } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import OrderConfirmation from "../app/customer/order-confirmation/[id]";
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
const mockParams = { id: "order123", payment: "returned" };
const mockGet = jest.fn();
const mockVerify = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }), useLocalSearchParams: () => mockParams, usePathname: () => "/customer/order-confirmation/order123" }));
jest.mock("./orderStorage", () => ({ getOrderById: (...args) => mockGet(...args), verifyOrderPayment: (...args) => mockVerify(...args) }));
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
test("backing out shows failure and returning to the app checks for delayed successful payment", async () => {
  const view = await render(<OrderConfirmation />);
  await waitFor(() => expect(screen.getByText("Transaction Failed")).toBeTruthy());
  mockVerify.mockResolvedValue({ ...pending, paymentStatus: "paid" });
  await act(async () => resume("active"));
  await waitFor(() => expect(screen.getByText("Payment successful")).toBeTruthy());
  expect(screen.queryByText("Transaction Failed")).toBeNull();
  await view.unmount();
  expect(remove).toHaveBeenCalled();
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
