import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AdminReports from "./AdminReports";

const apiRequest = vi.fn();
vi.mock("../../../config/api", () => ({ apiRequest: (...args) => apiRequest(...args) }));
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: { name: "Cavite Admin", email: "admin@test.local", role: "admin", activeBranch: "Cavite", assignedBranch: "Cavite" } }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const renderReport = () => render(<MemoryRouter><AdminReports /></MemoryRouter>);

it("requests paid branch sales with unshifted date-only filters and renders stored totals", async () => {
  apiRequest.mockResolvedValue({
    summary: { transactionCount: 1, totalOrderValue: 2490, amountCollected: 2490 },
    basis: "Stored paid transactions.", updatedAt: "2026-09-10T15:00:00.000Z",
    transactions: [{ orderCode: "ORD-1", total: 2490, amountCollected: 2490 }],
    products: [{ product: "AC One", unitsSold: 2, merchandiseSales: 2000 }],
  });
  renderReport();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/sales?"))).toBe(true));
  const requested = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/sales?"))[0];
  expect(requested).toContain("from=2026-09-01");
  expect(requested).toContain("to=2026-09-10");
  expect(requested).toContain("status=paid");
  expect(screen.getByText("ORD-1")).toBeInTheDocument();
  expect(screen.getAllByText("₱2,490.00").length).toBeGreaterThan(0);
});

it("loads the complete inventory report endpoint instead of the low-stock product endpoint", async () => {
  apiRequest.mockResolvedValue({
    summary: { productLines: 1, currentStockUnits: 3, inventoryValue: 60000, outOfStockItems: 0, lowStockItems: 0, inventoryVarianceItems: 0 },
    basis: "Current branch stock.", updatedAt: "2026-09-10T15:00:00.000Z",
    rows: [{ branch: "Cavite", sku: "AC-1", product: "AC One", currentStock: 3, stockValue: 60000, stockStatus: "In stock" }],
  });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Inventory Report" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("/reports/inventory?")));
  const reportRequest = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/inventory?"))[0];
  expect(reportRequest).not.toContain("low-stock");
  expect(screen.getByText("AC-1")).toBeInTheDocument();
  expect(screen.getAllByText("3").length).toBeGreaterThan(0);
});

it("blocks a reversed reporting range before requesting data", () => {
  renderReport();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-11" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  expect(screen.getByRole("alert")).toHaveTextContent("start date must be on or before");
  expect(screen.getByRole("button", { name: "Generate report" })).toBeDisabled();
  expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/"))).toBe(false);
});
