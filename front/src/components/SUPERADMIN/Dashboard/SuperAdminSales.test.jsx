import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SuperAdminSales from "./SuperAdminSales";

const apiRequest = vi.fn();
vi.mock("../../../config/api", () => ({ apiRequest: (...args) => apiRequest(...args) }));
vi.mock("../Common/SuperAdminLayout", () => ({ default: ({ children }) => <main>{children}</main> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows ten processing sales per page with numbered navigation", async () => {
  apiRequest.mockResolvedValue({
    orders: Array.from({ length: 12 }, (_, index) => ({
      id: `order-${index + 1}`,
      orderCode: `ORD-${String(index + 1).padStart(2, "0")}`,
      customerName: `Customer ${index + 1}`,
      stockSourceBranch: "Cavite",
      workflowStatus: "to_deliver",
      paymentMethod: "cod",
      totalAmount: 1000 + index,
      items: [{ name: "AC Unit", quantity: 1 }],
    })),
  });
  render(<SuperAdminSales />);
  await screen.findByText("Customer 1");
  expect(screen.getByText("Showing 1–10 of 12 orders")).toBeInTheDocument();
  expect(screen.queryByText("Customer 11")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
  expect(screen.getByText("Customer 11")).toBeInTheDocument();
  expect(screen.getByText("Showing 11–12 of 12 orders")).toBeInTheDocument();
  expect(screen.queryByText("Customer 1")).not.toBeInTheDocument();
});
