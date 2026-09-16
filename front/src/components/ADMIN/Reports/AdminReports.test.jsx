import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AdminReports from "./AdminReports";
import { exportHtmlToPdfViaPrint, exportToExcel } from "../../../utils/exporters";

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
  const report = {
    summary: { transactionCount: 1, totalOrderValue: 2490, amountCollected: 2490 },
    basis: "Stored paid transactions.", updatedAt: "2026-09-10T15:00:00.000Z",
    transactions: [{ orderCode: "ORD-1", sku: "AC-ONE-1HP", total: 2490, amountCollected: 2490 }],
    products: [{ sku: "AC-ONE-1HP", product: "AC One", unitsSold: 2, merchandiseSales: 2000 }],
  };
  apiRequest.mockImplementation(async (path) => path.startsWith("/reports/filter-options?")
    ? { customers: ["Customer One"], technicians: [], skus: ["AC-ONE-1HP"], brands: ["Cold Air"] }
    : report);
  renderReport();
  await screen.findByRole("option", { name: "AC-ONE-1HP" });
  expect(screen.getByLabelText("Customer").tagName).toBe("SELECT");
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "gcash" } });
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "ORD-1" } });
  fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "AC-ONE-1HP" } });
  fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Customer One" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/sales?"))).toBe(true));
  const requested = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/sales?"))[0];
  expect(requested).toContain("from=2026-09-01");
  expect(requested).toContain("to=2026-09-10");
  expect(requested).toContain("status=paid");
  expect(requested).toContain("paymentMethod=gcash");
  expect(requested).toContain("search=ORD-1");
  expect(requested).toContain("sku=AC-ONE-1HP");
  expect(requested).toContain("customer=Customer+One");
  expect(screen.getByText("ORD-1")).toBeInTheDocument();
  expect(screen.getAllByText("SKU").length).toBeGreaterThan(0);
  expect(screen.getAllByText("AC-ONE-1HP").length).toBeGreaterThan(0);
  expect(screen.getAllByText("₱2,490.00").length).toBeGreaterThan(0);
});

it("loads the complete inventory report endpoint instead of the low-stock product endpoint", async () => {
  const report = {
    summary: { productLines: 1, currentStockUnits: 3, inventoryValue: 60000, outOfStockItems: 0, lowStockItems: 0 },
    basis: "Current branch stock.", updatedAt: "2026-09-10T15:00:00.000Z",
    rows: [{ branch: "Cavite", sku: "AC-1", product: "AC One", currentStock: 3, availableSerials: 2, soldUnits: 1, stockValue: 60000, stockStatus: "In stock", assignedUnits: 1, serviceUnits: 0, retiredUnits: 0, trackedUnits: 3, inventoryVariance: 1, reorderLevel: 2 }],
  };
  apiRequest.mockImplementation(async (path) => path.startsWith("/reports/filter-options?")
    ? { customers: [], technicians: [], skus: ["AC-1"], brands: ["Cold Air"] }
    : report);
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Inventory Report" }));
  await screen.findByRole("option", { name: "AC-1" });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "split" } });
  fireEvent.change(screen.getByLabelText("Brand"), { target: { value: "Cold Air" } });
  fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "AC-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("/reports/inventory?")));
  const reportRequest = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/inventory?"))[0];
  expect(reportRequest).not.toContain("low-stock");
  expect(reportRequest).toContain("category=split");
  expect(reportRequest).toContain("brand=Cold+Air");
  expect(reportRequest).toContain("sku=AC-1");
  expect(screen.getAllByText("AC-1").length).toBeGreaterThan(1);
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

it("requests active technician performance for the selected date range and search", async () => {
  const report = {
    summary: { technicianCount: 1, completedInPeriod: 3 },
    basis: "Completed work orders in the period.",
    updatedAt: "2026-09-10T15:00:00.000Z",
    rows: [{ technician: "Active Technician", branch: "Cavite", completedWorkOrders: 3 }],
  };
  apiRequest.mockImplementation(async (path) => path.startsWith("/reports/filter-options?")
    ? { customers: [], technicians: [{ value: "507f1f77bcf86cd799439011", label: "Active Technician", branch: "Cavite" }], skus: [], brands: [] }
    : report);
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Technician Performance" }));
  await screen.findByRole("option", { name: "Active Technician" });
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "Active" } });
  fireEvent.change(screen.getByLabelText("Technician"), { target: { value: "507f1f77bcf86cd799439011" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/technicians?"))).toBe(true));
  const requested = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/technicians?"))[0];
  expect(requested).toContain("from=2026-09-01");
  expect(requested).toContain("to=2026-09-10");
  expect(requested).toContain("search=Active");
  expect(requested).toContain("technician=507f1f77bcf86cd799439011");
  expect(screen.getAllByText("Active Technician").length).toBeGreaterThan(0);
  expect(screen.getAllByText("3").length).toBeGreaterThan(0);
});

it("renders grounded sales, service, inventory, and AMP business intelligence", async () => {
  apiRequest.mockResolvedValue({
    provider: "openai",
    summary: {
      sales: { amountCollected: 50000, unitsSold: 3 },
      service: { completedServices: 4 },
      inventory: { currentStockUnits: 12 },
      amp: { dueWithin30Days: 2, overdue: 1, conditionFollowUps: 1 },
    },
    insights: {
      sales: [{ id: "sales", statement: "Model A has the highest recorded sales volume.", action: "Review stock." }],
      service: [{ id: "service", statement: "Regular cleaning is the most recorded service.", action: "Plan capacity." }],
      inventory: [{ id: "inventory", statement: "Two lines are low in stock.", action: "Review replenishment." }],
      amp: [{ id: "amp", statement: "One unit needs a condition follow-up.", action: "Review its plan." }],
    },
    charts: {
      salesTrend: [{ bucket: "2026-09-01T00:00:00.000Z", amountCollected: 50000 }],
      serviceTrend: [{ bucket: "2026-09", count: 4 }],
      serviceByType: [{ type: "regular_cleaning", label: "regular cleaning", count: 4 }],
    },
    tables: {
      topModels: [], topBrands: [], servicedModels: [], commonIssues: [],
      serviceParts: [{ part: "air filter", count: 2 }], inventoryMovement: [],
    },
    basis: "Verified records.", updatedAt: "2026-09-16T00:00:00.000Z",
  });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Business Intelligence" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await waitFor(() => expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/business-intelligence?"))).toBe(true));
  expect(screen.getByText("Model A has the highest recorded sales volume.")).toBeInTheDocument();
  expect(screen.getByText("₱50,000.00")).toBeInTheDocument();
  expect(screen.getByText("Collected sales trend")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Business intelligence page 2" }));
  expect(screen.getByText("Regular cleaning is the most recorded service.")).toBeInTheDocument();
  expect(screen.getByText("Completed service trend")).toBeInTheDocument();
  expect(screen.getByText("Frequently recorded service parts")).toBeInTheDocument();
  expect(screen.getByText("air filter")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Business intelligence page 3" }));
  expect(screen.getByText("Two lines are low in stock.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Business intelligence page 4" }));
  expect(screen.getByText("One unit needs a condition follow-up.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  expect(exportToExcel).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const exportedHtml = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0].html;
  expect((exportedHtml.match(/class="report-page"/g) || []).length).toBe(4);
});

it("paginates the sales transaction register", async () => {
  const transactions = Array.from({ length: 12 }, (_, index) => ({
    orderCode: `ORD-${String(index + 1).padStart(2, "0")}`,
    customer: `Customer ${index + 1}`,
    sku: `SKU-${index + 1}`,
    total: 1000 + index,
  }));
  apiRequest.mockResolvedValue({ summary: { transactionCount: 12 }, transactions, products: [], basis: "Paid records.", updatedAt: "2026-09-16T00:00:00.000Z" });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  expect(await screen.findByText("ORD-01")).toBeInTheDocument();
  expect(screen.queryByText("ORD-11")).not.toBeInTheDocument();
  expect(screen.getByText("Showing 1–10 of 12 records")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sales report page 2" }));
  expect(screen.getByText("ORD-11")).toBeInTheDocument();
  expect(screen.queryByText("ORD-01")).not.toBeInTheDocument();
});

it("blocks a reversed reporting range before requesting data", () => {
  renderReport();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-11" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  expect(screen.getByRole("alert")).toHaveTextContent("start date must be on or before");
  expect(screen.getByRole("button", { name: "Generate report" })).toBeDisabled();
  expect(apiRequest.mock.calls.some(([path]) => ["/reports/sales?", "/reports/inventory?", "/reports/technicians?", "/reports/business-intelligence?"].some((prefix) => path.startsWith(prefix)))).toBe(false);
});
