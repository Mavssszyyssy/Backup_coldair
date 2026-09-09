import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import ServicePaymentCard from "../components/technician/ServicePaymentCard";
import { collectServicePayment } from "./taskStorage";
import { paymentMethodLabel } from "./paymentMethodLabel";

jest.mock("./taskStorage", () => ({ collectServicePayment: jest.fn() }));
jest.mock("./ecommerceService", () => ({ formatPeso: amount => `PHP ${Number(amount).toFixed(2)}` }));
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.clearAllMocks(); });
const task = (status, checkedIn = false) => ({ id: "visit1", status: "in-progress", checkIn: checkedIn ? { checkedInAt: "2026-09-09T00:00:00Z" } : null, servicePayment: { amount: status === "quote_required" ? null : 800, status, quoteId: "quote1" } });

test("cash collection is unavailable before GPS check-in", async () => {
  const alert = jest.spyOn(Alert, "alert");
  await render(<ServicePaymentCard task={task("due")} onUpdated={jest.fn()} />);
  expect(screen.getByText("PHP 800.00 · Cash due")).toBeTruthy();
  await fireEvent.press(screen.getByText("Confirm service cash collected"));
  expect(alert).not.toHaveBeenCalled();
  expect(collectServicePayment).not.toHaveBeenCalled();
});

test("technician explicitly confirms the displayed quote after GPS check-in", async () => {
  const updated = { ...task("paid", true) };
  collectServicePayment.mockResolvedValue(updated);
  const onUpdated = jest.fn();
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => buttons?.find(button => button.text === "Cash received")?.onPress());
  const current = task("due", true);
  await render(<ServicePaymentCard task={current} onUpdated={onUpdated} />);
  await fireEvent.press(screen.getByText("Confirm service cash collected"));
  await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  expect(collectServicePayment).toHaveBeenCalledWith("visit1", current.servicePayment);
});

test.each(["quote_required", "warranty_covered", "no_charge", "paid"])("%s never offers cash collection", async status => {
  await render(<ServicePaymentCard task={task(status, true)} onUpdated={jest.fn()} />);
  expect(screen.queryByText("Confirm service cash collected")).toBeNull();
});

test("closed historical visits do not ask for a new quote", async () => {
  await render(<ServicePaymentCard task={{ ...task("quote_required"), status: "completed" }} onUpdated={jest.fn()} />);
  expect(screen.getByText("Payment amount not recorded for this closed visit")).toBeTruthy();
  expect(screen.queryByText(/Awaiting Admin/)).toBeNull();
});

test("receipt labels preserve the actual selected payment method", () => {
  expect(paymentMethodLabel("gcash")).toBe("GCash");
  expect(paymentMethodLabel("credit")).toBe("Credit / debit card");
  expect(paymentMethodLabel("cod")).toBe("Cash on Delivery");
  expect(paymentMethodLabel("maya")).toBe("Maya");
  expect(paymentMethodLabel("paymongo")).toBe("Online payment (method not recorded)");
});
