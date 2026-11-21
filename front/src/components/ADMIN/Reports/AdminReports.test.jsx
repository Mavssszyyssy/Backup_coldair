import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AdminReports from "./AdminReports";
import { exportHtmlToPdfViaPrint, exportToExcel } from "../../../utils/exporters";

const apiRequest = vi.fn();
let role = "admin";
vi.mock("../../../config/api", () => ({ apiRequest: (...args) => apiRequest(...args) }));
vi.mock("../../../utils/exporters", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, exportHtmlToPdfViaPrint: vi.fn(), exportToExcel: vi.fn() };
});
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ user: { name: "Cavite Admin", email: "admin@test.local", role, activeBranch: "Cavite", assignedBranch: "Cavite" } }),
}));

afterEach(() => { cleanup(); role = "admin"; vi.useRealTimers(); vi.clearAllMocks(); });
const renderReport = () => render(<MemoryRouter><AdminReports /></MemoryRouter>);

it("shows the default Sales Report first and switches without loading other reports automatically", async () => {
  apiRequest.mockResolvedValue({ customers: [], technicians: [], skus: [], brands: [] });
  renderReport();
  const tabs = screen.getAllByRole("button", { name: /Report|Performance|Intelligence/ });
  expect(tabs[0]).toHaveTextContent("Sales Report");
  expect(tabs[0]).toHaveAttribute("aria-current", "page");
  fireEvent.click(screen.getByRole("button", { name: "Business Intelligence" }));
  expect(screen.getByRole("button", { name: "Business Intelligence" })).toHaveAttribute("aria-current", "page");
  expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/reports/sales?") || path.startsWith("/reports/business-intelligence?"))).toBe(false);
});

it.each(["admin", "superadmin"])("resets report dates on tab changes for %s and keeps inventory current", async (reportRole) => {
  role = reportRole;
  vi.setSystemTime(new Date("2026-11-14T16:15:00Z"));
  apiRequest.mockResolvedValue({ customers: [], technicians: [], skus: [], brands: [], rows: [], summary: {} });
  renderReport();
  const expectDefaultDates = () => {
    expect(screen.getByLabelText("From")).toHaveValue("2026-10-16");
    expect(screen.getByLabelText("To")).toHaveValue("2026-11-15");
  };

  expectDefaultDates();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Business Intelligence" }));
  expectDefaultDates();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-02" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });

  fireEvent.click(screen.getByRole("button", { name: "Inventory Report" }));
  expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("To")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  const inventoryRequest = apiRequest.mock.calls.find(([url]) => url.startsWith("/reports/inventory?"))[0];
  const inventoryFilters = new URLSearchParams(inventoryRequest.split("?")[1]);
  expect(inventoryFilters.has("from")).toBe(false);
  expect(inventoryFilters.has("to")).toBe(false);
  await screen.findByRole("button", { name: "Generate report" });

  fireEvent.click(screen.getByRole("button", { name: "Technician Performance" }));
  expectDefaultDates();
  fireEvent.click(screen.getByRole("button", { name: "Business Intelligence" }));
  expectDefaultDates();
  fireEvent.click(screen.getByRole("button", { name: "Sales Report" }));
  expectDefaultDates();
});

it("requests paid branch sales with unshifted date-only filters and renders stored totals", async () => {
  const report = {
    summary: { transactionCount: 1, unitsSold: 2, totalOrderValue: 3490, amountCollected: 2490, paidRevenue: 2490 },
    interpretation: { status: "ready", summary: "Collected revenue is below the total order value.", reviewAction: "Review the matching payment records." },
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
  expect(requested).toContain("interpretation=1");
  expect(screen.getByText("ORD-1")).toBeInTheDocument();
  expect(screen.getAllByText("SKU").length).toBeGreaterThan(0);
  expect(screen.getAllByText("AC-ONE-1HP").length).toBeGreaterThan(0);
  expect(screen.getAllByText("₱2,490.00").length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Key performance indicators" })).toBeInTheDocument();
  expect(screen.getByText("Total orders")).toBeInTheDocument();
  expect(screen.getByText("Collected revenue is below the total order value.")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "next-draft-search" } });
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const excel = exportToExcel.mock.calls.at(-1)[0];
  const pdf = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0];
  expect(excel.summary).toMatchObject({ paidRevenue: 2490, transactionCount: 1, unitsSold: 2 });
  expect(excel.summaryLabels.paidRevenue).toBe("Total revenue collected");
  expect(excel.rowHeading).toBe("Sales list");
  expect(excel.metadata.filters).toContain("Search: ORD-1");
  expect(pdf.metadata.filters).toEqual(excel.metadata.filters);
  expect(pdf.html).toContain('class="summary summary--kpis"');
  expect(pdf.html).toContain("Sales list");
  expect(excel.notes.lines).toContain("For decision support only. AI does not replace human judgment.");
  for (const line of excel.notes.lines) expect(pdf.html).toContain(line);
});

it("loads the complete inventory report endpoint instead of the low-stock product endpoint", async () => {
  const report = {
    summary: { productLines: 1, currentStockUnits: 3, inventoryValue: 60000, outOfStockItems: 0, lowStockItems: 0 },
    interpretation: { status: "unavailable" },
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
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining("/reports/inventory?"), { revalidate: true, onCached: expect.any(Function) }));
  const reportRequest = apiRequest.mock.calls.find(([path]) => path.startsWith("/reports/inventory?"))[0];
  expect(reportRequest).not.toContain("low-stock");
  expect(reportRequest).toContain("category=split");
  expect(reportRequest).toContain("brand=Cold+Air");
  expect(reportRequest).toContain("sku=AC-1");
  expect(reportRequest).toContain("interpretation=1");
  expect(screen.getAllByText("AC-1").length).toBeGreaterThan(1);
  expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  for (const removedHeader of ["Assigned", "In service", "Retired", "Tracked units", "Stock / QR variance", "Reorder level"]) {
    expect(screen.queryByRole("columnheader", { name: removedHeader })).not.toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  const exportedHtml = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0].html;
  const notes = exportToExcel.mock.calls.at(-1)[0].notes;
  expect(notes.lines).toContain("AI interpretation is unavailable for this report.");
  for (const line of notes.lines) expect(exportedHtml).toContain(line);
  for (const removedHeader of ["Assigned", "In service", "Retired", "Tracked units", "Stock / QR variance", "Reorder level"]) {
    expect(exportedHtml).not.toContain(removedHeader);
  }
});

it("paginates inventory rows on screen and exports all rows without embedded page markers", async () => {
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
  expect(exportedHtml).not.toMatch(/\bPage\s+\d+/i);
  expect(exportedHtml.match(/<table\b/g)).toHaveLength(1);
  expect(exportedHtml).not.toContain('class="report-page"');
  expect(exportedHtml).toContain("AC-01");
  expect(exportedHtml).toContain("AC-23");
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  const excel = exportToExcel.mock.calls.at(-1)[0];
  expect(excel.rows).toEqual(rows);
  expect(excel.rowHeading).toBe("Branch stock register");
  expect(excel.columnLabel("currentStock")).toBe("Stock");
  expect(excel.columnLabel("stockValue")).toBe("Stock value");
});

it.each(["admin", "superadmin"])("requests technician performance for the selected date range and search as %s", async (reportRole) => {
  role = reportRole;
  const report = {
    summary: { technicianCount: 1, completedInPeriod: 3 },
    basis: "Completed work orders in the period.",
    updatedAt: "2026-09-10T15:00:00.000Z",
    rows: [{ technician: "Active Technician", branch: "Cavite", completedWorkOrders: 3, averageCompletionHours: 2.5, onTimeRate: 66.67 }],
  };
  apiRequest.mockImplementation(async (path) => path.startsWith("/reports/filter-options?")
    ? { customers: [], technicians: [{ value: "507f1f77bcf86cd799439011", label: "Active Technician", branch: "Cavite" }], skus: [], brands: [] }
    : report);
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Technician Performance" }));
  const technicianOption = reportRole === "superadmin" ? "Active Technician · Cavite" : "Active Technician";
  await screen.findByRole("option", { name: technicianOption });
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
  expect(screen.getByRole("columnheader", { name: "Average completion time (hours)" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "On-time rate" })).toBeInTheDocument();
  expect(screen.getByText("2.5")).toBeInTheDocument();
  expect(screen.getByText("66.67%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  const excel = exportToExcel.mock.calls.at(-1)[0];
  expect(excel.rows).toEqual(report.rows);
  expect(excel.summary).toEqual(report.summary);
  expect(excel.columnLabel("averageCompletionHours")).toBe("Average completion time (hours)");
  expect(excel.columnLabel("onTimeRate")).toBe("On-time rate");
  expect(excel.rowHeading).toBe("Technician performance");
  expect(excel.metadata.filters).toContain("Active Technician");
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const pdf = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0];
  for (const value of ["Active Technician", "Average completion time (hours)", "66.67%", "2.5", "Completed in period"]) expect(pdf.html).toContain(value);
  expect(pdf.title).toBe(excel.title);
  expect(pdf.metadata.generatedAt).toBe(excel.metadata.generatedAt);
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
  expect(exportedHtml).not.toMatch(/Page \d+ of \d+/);
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

  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const exported = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0];
  expect(exported.html).toContain('class="report-section report-section--splittable report-page--sales"');
  expect(exported.html).toContain('class="report-table report-table--operations"');
  expect(exported.html).toContain('class="report-table report-table--financial"');
  expect(exported.html).not.toMatch(/Page \d+ of \d+/);
  expect(exported.html).toContain("ORD-01");
  expect(exported.html).toContain("ORD-12");
  expect(exported.metadata).toMatchObject({ pageOrientation: "landscape", documentStyle: "tabular" });
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  expect(exportToExcel.mock.calls.at(-1)[0].rows).toEqual(transactions);
});

it("blocks a reversed reporting range before requesting data", () => {
  renderReport();
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-11" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-10" } });
  expect(screen.getByRole("alert")).toHaveTextContent("start date must be on or before");
  expect(screen.getByRole("button", { name: "Generate report" })).toBeDisabled();
  expect(apiRequest.mock.calls.some(([path]) => ["/reports/sales?", "/reports/inventory?", "/reports/technicians?", "/reports/business-intelligence?"].some((prefix) => path.startsWith(prefix)))).toBe(false);
});

it.each(["admin", "superadmin"])("exports the refreshed sales snapshot and product summary as %s", async (reportRole) => {
  role = reportRole;
  const old = { summary: { paidRevenue: 100, transactionCount: 1 }, transactions: [{ orderCode: "ORD-OLD", transactionDate: "2026-11-20T00:00:00Z", total: 100 }], products: [{ product: "Old model", sales: 100 }], updatedAt: "2026-11-20T00:00:00Z", basis: "Stored paid transactions." };
  const latest = { ...old, summary: { paidRevenue: 4321.5, transactionCount: 2 }, transactions: [{ orderCode: "ORD-LATEST", transactionDate: "2026-11-21T00:00:00Z", total: 4321.5 }], products: [{ product: "Latest model", sku: "LATEST-SKU", unitsSold: 2, merchandiseSales: 4321.5 }], updatedAt: "2026-11-21T00:00:00Z" };
  let finish;
  let generated = false;
  apiRequest.mockImplementation((path, options) => {
    if (!path.startsWith("/reports/sales?")) return Promise.resolve({});
    expect(options.revalidate).toBe(true);
    if (!generated) { generated = true; return Promise.resolve(old); }
    options.onCached(old);
    return new Promise((resolve) => { finish = resolve; });
  });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await screen.findByText("ORD-OLD");
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  expect(screen.getByText("ORD-OLD")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  await act(async () => { finish(latest); });
  expect(screen.getByText("ORD-LATEST")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const excel = exportToExcel.mock.calls.at(-1)[0];
  const pdf = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0];
  expect(excel.rows).toEqual(latest.transactions);
  expect(excel.additionalTables).toEqual([{ title: "Product sales summary", rows: latest.products }]);
  expect(excel.summary.paidRevenue).toBe(4321.5);
  expect(excel.columnLabel("transactionDate")).toBe("Transaction date");
  const dateText = excel.formatText(latest.transactions[0].transactionDate, "transactionDate");
  expect(pdf.html).toContain(dateText);
  for (const text of ["ORD-LATEST", "Latest model", "LATEST-SKU", "₱4,321.50"]) expect(pdf.html).toContain(text);
  expect(pdf.html).not.toContain("ORD-OLD");
  expect(pdf.title).toBe(excel.title);
  expect(pdf.metadata.generatedAt).toBe(excel.metadata.generatedAt);
});

it.each(["admin", "superadmin"])("exports all BI tables and fields shown across four preview pages as %s", async (reportRole) => {
  role = reportRole;
  const intelligence = {
    summary: { sales: { amountCollected: 12345.5, unitsSold: 3 }, service: { completedServices: 7 }, inventory: { currentStockUnits: 13 }, amp: { dueWithin30Days: 4, overdue: 2, conditionFollowUps: 1 } },
    insights: Object.fromEntries(["sales", "service", "inventory", "amp"].map((category) => [category, [{ id: category, statement: `${category} evidence`, action: `${category} action` }]])),
    charts: { salesTrend: [{ bucket: "2026-11-20T00:00:00Z", amountCollected: 12345.5 }], serviceTrend: [{ bucket: "2026-11", count: 7 }], serviceByType: [{ label: "Chemical cleaning", count: 7 }] },
    tables: {
      topModels: [{ brand: "Example brand", model: "Premium model", sku: "BI-SKU", unitsSold: 3, sales: 12345.5 }], topBrands: [{ brand: "Example brand", unitsSold: 3 }],
      servicedModels: [{ model: "Serviced model", count: 7 }], commonIssues: [{ issue: "No cooling", count: 5 }], serviceParts: [{ part: "Control board", count: 2 }],
      inventoryMovement: [{ branch: "Cavite", product: "Moving model", sku: "MOVING-SKU", unitsSoldInPeriod: 3, currentStock: 13, stockStatus: "In stock" }],
      slowMovingInventory: [{ branch: "Cavite", product: "Slow model", sku: "SLOW-SKU", currentStock: 4, stockStatus: "Low stock" }],
    },
    warning: "AI unavailable; verified records shown.", basis: "Verified records only.", updatedAt: "2026-11-21T00:00:00Z",
  };
  apiRequest.mockResolvedValue(intelligence);
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Business Intelligence" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await screen.findByText("Premium model");
  for (let page = 2; page <= 4; page++) fireEvent.click(screen.getByRole("button", { name: `Business intelligence page ${page}` }));
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const excel = exportToExcel.mock.calls.at(-1)[0];
  const pdf = exportHtmlToPdfViaPrint.mock.calls.at(-1)[0];
  expect(excel.rows).toEqual([]);
  expect(excel.metadata.analysisStatus).toBe(intelligence.warning);
  expect(excel.summary.amountCollected).toBe(12345.5);
  expect(excel.summary.unitsSold).toBe(3);
  expect(excel.additionalTables.find((table) => table.title === "Best-selling AC models").rows[0]).toEqual(intelligence.tables.topModels[0]);
  expect(excel.additionalTables.find((table) => table.title === "Inventory movement and current stock").rows[0]).toEqual(intelligence.tables.inventoryMovement[0]);
  const allExcelContent = JSON.stringify(excel.additionalTables);
  for (const value of ["Chemical cleaning", "Premium model", "BI-SKU", "Serviced model", "No cooling", "Control board", "MOVING-SKU", "In stock", "SLOW-SKU", "Low stock", "amp evidence", "amp action"]) {
    expect(allExcelContent).toContain(value);
    expect(pdf.html).toContain(value);
  }
  expect(pdf.html).toContain("₱12,345.50");
  expect(pdf.html).toContain(intelligence.warning);
  expect(pdf.html).toContain("Recorded service mix");
  expect(excel.additionalTables.flatMap((table) => table.rows).some((row) => Object.hasOwn(row, "value"))).toBe(false);
});

it("exports a completed empty technician report with its zero summary and no-records message", async () => {
  apiRequest.mockResolvedValue({ summary: { technicianCount: 0, completedInPeriod: 0 }, rows: [], basis: "Completed work orders in the period.", updatedAt: "2026-11-21T00:00:00Z" });
  renderReport();
  fireEvent.click(screen.getByRole("button", { name: "Technician Performance" }));
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await screen.findByText("No records match the selected filters.");
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  expect(exportToExcel.mock.calls.at(-1)[0].summary).toEqual({ technicianCount: 0, completedInPeriod: 0 });
  expect(exportToExcel.mock.calls.at(-1)[0].rows).toEqual([]);
  expect(exportHtmlToPdfViaPrint.mock.calls.at(-1)[0].html).toContain("No matching records.");
});
