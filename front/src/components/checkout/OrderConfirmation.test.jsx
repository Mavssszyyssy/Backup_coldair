import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OrderConfirmation from "./OrderConfirmation";
import { apiRequest } from "../../config/api";
vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
const pending = { id: "order123", orderCode: "ORD-123", paymentProvider: "paymongo", paymentStatus: "pending", workflowStatus: "to_pay", items: [] };
const show = (state = "returned") => render(
  <MemoryRouter initialEntries={[`/order-confirmation/order123?payment=${state}`]}>
    <Routes><Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} /></Routes>
  </MemoryRouter>,
);
beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue({ order: pending });
});
test("browser Back verifies pending checkout and displays Transaction Failed, not Order Success", async () => {
  show();
  await screen.findByRole("heading", { name: "Transaction Failed", level: 1 });
  expect(apiRequest).toHaveBeenCalledWith("/orders/order123/paymongo/verify", { method: "POST" });
  expect(screen.queryByText("Order Success")).not.toBeInTheDocument();
});
test("paid result wins over cancelled URL", async () => {
  apiRequest.mockImplementation(async (url) => ({ order: url.endsWith("/verify") ? { ...pending, paymentStatus: "paid" } : pending }));
  show("cancelled");
  await screen.findByRole("heading", { name: "Payment successful", level: 1 });
  expect(screen.queryByText("Transaction Failed")).not.toBeInTheDocument();
});
test("verification outage is not success; a later recheck displays the confirmed result", async () => {
  apiRequest.mockImplementation(async (url) => {
    if (url.endsWith("/verify")) throw new Error("offline");
    return { order: pending };
  });
  show("success");
  await screen.findByText(/Unable to confirm payment/);
  expect(screen.queryByText("Order Success")).not.toBeInTheDocument();
  apiRequest.mockResolvedValue({ order: { ...pending, paymentStatus: "paid" } });
  fireEvent.click(screen.getByRole("button", { name: "Check payment status" }));
  await screen.findByRole("heading", { name: "Payment successful", level: 1 });
});
test("returning to an existing page rechecks delayed payment", async () => {
  show();
  await screen.findByRole("heading", { name: "Transaction Failed", level: 1 });
  apiRequest.mockResolvedValue({ order: { ...pending, paymentStatus: "paid" } });
  await act(async () => window.dispatchEvent(new Event("pageshow")));
  await screen.findByRole("heading", { name: "Payment successful", level: 1 });
});
