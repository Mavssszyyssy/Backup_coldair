import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AdminReports from "./AdminReports";
import { exportHtmlToPdfViaPrint } from "../../../utils/exporters";

const apiRequest = vi.fn();
vi.mock("../../../config/api", () => ({ apiRequest: (...args) => apiRequest(...args) }));
vi.mock("../../../utils/exporters", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, exportHtmlToPdfViaPrint: vi.fn(), exportToExcel: vi.fn() };
});
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: { name: "Cavite Admin", email: "admin@test.local", role: "admin", activeBranch: "Cavite", assignedBranch: "Cavite" } }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const renderReport = () => render(<MemoryRouter><AdminReports /></MemoryRouter>);

it("requests paid branch sales with unshifted date-only filters and renders stored totals", async () => {
  apiRequest.mockResolvedValue({
    summary: { transactionCount: 1, totalOrderValue: 2490, amountCollected: 2490 },
    basis: "Stored paid transactions.", updatedAt: "2026-09-10T15:00:00.000Z",
    transactions: [{ orderCode: "ORD-1", sku: "AC-ONE-1HP", total: 2490, amountCollected: 2490 }],
    products: [{ sku: "AC-ONE-1HP", product: "AC One", unitsSold: 2, merchandiseSales: 2000 }],
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
  expect(screen.getAllByText("SKU").length).toBeGreaterThan(0);
  expect(screen.getAllByText("AC-ONE-1HP").length).toBeGreaterThan(0);
  expect(screen.getAllByText("₱2,490.00").length).toBeGreaterThan(0);
});

it("loads the complete inventory report endpoint instead of the low-stock product endpoint", async () => {
  apiRequest.mockResolvedValue({
    summary: { productLines: 1, currentStockUnits: 3, inventoryValue: 60000, outOfStockItems: 0, lowStockItems: 0 },
    basis: "Current branch stock.", updatedAt: "2026-09-10T15:00:00.000Z",
    rows: [{ branch: "Cavite", sku: "AC-1", product: "AC One", currentStock: 3, availableSerials: 2, soldUnits: 1, stockValue: 60000, stockStatus: "In stock", assignedUnits: 1, serviceUnits: 0, retiredUnits: 0, trackedUnits: 3, inventoryVariance: 1, reorderLevel: 2 }],
  });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Inventory Report" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("/reports/inventory?")));
  const reportRequest = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/inventory?"))[0];
  expect(reportRequest).not.toContain("low-stock");
  expect(screen.getByText("AC-1")).toBeInTheDocument();
  expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  for (const removedHeader of ["Assigned", "In service", "Retired", "Tracked units", "Stock / QR variance", "Reorder level"]) {
    expect(screen.queryByRole("columnheader", { name: removedHeader })).not.toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const exportedHtml = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0].html;
  for (const removedHeader of ["Assigned", "In service", "Retired", "Tracked units", "Stock / QR variance", "Reorder level"]) {
    expect(exportedHtml).not.toContain(removedHeader);
  }
});

it("paginates inventory rows in the screen and preserves those pages in the PDF", async () => {
  const rows = Array.from({ length: 23 }, (_, index) => ({
    branch: "Cavite", sku: `AC-${String(index + 1).padStart(2, "0")}`,
    product: `AC Unit ${index + 1}`, currentStock: index + 1,
    stockValue: (index + 1) * 1000, stockStatus: "In stock",
  }));
  apiRequest.mockResolvedValue({
    summary: { productLines: rows.length, currentStockUnits: 276 },
    basis: "Current branch stock.", updatedAt: "2026-09-10T15:00:00.000Z", rows,
  });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Inventory Report" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await screen.findByText("AC-01");
  expect(screen.queryByText("AC-11")).not.toBeInTheDocument();
  expect(screen.getByText("Showing 1–10 of 23 records")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Inventory report page 2" }));
  expect(screen.getByText("AC-11")).toBeInTheDocument();
  expect(screen.queryByText("AC-01")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const exportedHtml = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0].html;
  expect((exportedHtml.match(/class="report-page"/g) || []).length).toBe(3);
  expect(exportedHtml).toContain("Page 1 of 3");
  expect(exportedHtml).toContain("Page 3 of 3");
  expect(exportedHtml).toContain("AC-01");
  expect(exportedHtml).toContain("AC-23");
});

it("requests the complete active technician KPI list for the technician report", async () => {
  apiRequest.mockResolvedValue({
    stats: { branchLabel: "Cavite" },
    analytics: { technicianKPIs: [{ name: "Active Technician", branch: "Cavite", completedToday: 1, completedWeek: 2, completedMonth: 3 }] },
  });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Technician Performance" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/dashboard/me?includeAllTechnicians=true"));
  expect(screen.getByText("Active Technician")).toBeInTheDocument();
});

it("blocks a reversed reporting range before requesting data", () => {
  renderReport();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-11" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  expect(screen.getByRole("alert")).toHaveTextContent("start date must be on or before");
  expect(screen.getByRole("button", { name: "Generate report" })).toBeDisabled();
  expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/"))).toBe(false);
});
