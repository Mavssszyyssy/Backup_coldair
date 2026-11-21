import { afterEach, expect, it, vi } from "vitest";
import { exportHtmlToPdfViaPrint, exportToExcel } from "./exporters";
import { downloadElementPdf } from "./pdfDownload";

vi.mock("./pdfDownload", () => ({ downloadElementPdf: vi.fn(async () => true) }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("writes a parseable Excel report with numeric KPIs, escaped AI notes and the sales list", async () => {
  const createObjectURL = vi.fn(() => "blob:report");
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  exportToExcel({
    summary: { paidRevenue: 12000, transactionCount: 2 },
    summaryHeading: "Key performance indicators",
    summaryLabels: { paidRevenue: "Total revenue collected", transactionCount: "Total orders" },
    notes: { title: "AI interpretation", lines: ["Check revenue & cash collection.", "For decision support only. AI does not replace human judgment."] },
    rowHeading: "Sales list",
    rows: [{ orderCode: "ORD-1", total: 12000 }, { orderCode: "ORD-2", total: 0 }],
  });
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  const blob = createObjectURL.mock.calls[0][0];
  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
  const xml = new DOMParser().parseFromString(text, "application/xml");
  expect(xml.querySelector("parsererror")).toBeNull();
  const namespace = "urn:schemas-microsoft-com:office:spreadsheet";
  const rows = [...xml.getElementsByTagNameNS(namespace, "Row")];
  const row = (label) => rows.find((element) => element.firstElementChild?.textContent === label);
  expect(row("Total revenue collected").lastElementChild.getAttributeNS(namespace, "StyleID")).toBe("currency");
  expect(row("Total orders").lastElementChild.getAttributeNS(namespace, "StyleID")).toBe("integer");
  expect(row("Check revenue & cash collection.")).toBeDefined();
  expect(rows.indexOf(row("AI interpretation"))).toBeLessThan(rows.indexOf(row("Sales list")));
  expect(row("ORD-2")).toBeDefined();
});

it("downloads a report PDF without opening the print dialog or retaining a blank renderer", async () => {
  const open = vi.spyOn(window, "open");
  const print = vi.spyOn(window, "print");
  await exportHtmlToPdfViaPrint({
    title: "Sales Report",
    html: '<section class="report-page"><table><tr><td>Order</td></tr></table></section>',
    fileName: "sales-report.pdf",
    metadata: { documentStyle: "tabular", pageOrientation: "landscape" },
  });
  expect(downloadElementPdf).toHaveBeenCalledWith(expect.objectContaining({
    fileName: "sales-report.pdf",
    orientation: "landscape",
    pageFooter: { label: "Sales Report" },
  }));
  expect(downloadElementPdf.mock.calls[0][0].element.nodeType).toBe(1);
  expect(downloadElementPdf.mock.calls[0][0].element.innerHTML).toContain("Order");
  expect(open).not.toHaveBeenCalled();
  expect(print).not.toHaveBeenCalled();
  expect(document.querySelector('iframe[title="PDF export renderer"]')).toBeNull();
});

it("keeps every table, later-row columns, dates and numeric formats in the Excel file", async () => {
  const createObjectURL = vi.fn(() => "blob:report");
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  exportToExcel({
    title: "Complete report", rowHeading: "Sales list",
    rows: [{ orderCode: "ORD-FIRST", transactionDate: "2026-11-21T00:00:00Z" }, { orderCode: "ORD-LAST", transactionDate: "2026-11-21T00:00:00Z", amountCollected: 1234.5 }],
    additionalTables: [
      { title: "Product sales summary", rows: [{ sku: "SKU-ONE", sales: 1234.5, unitsSold: 2 }] },
      { title: "Technician performance", rows: [{ technician: "Cavite Technician", averageCompletionHours: 2.5, onTimeRate: 66.67 }] },
    ],
    columnLabel: (key) => ({ transactionDate: "Transaction date", averageCompletionHours: "Average completion time (hours)" }[key] || key),
    formatText: (value, key) => key === "transactionDate" ? "21 Nov 2026, 08:00 GMT+8" : value,
    metadata: { basis: "Verified report records", analysisStatus: "Analysis is unavailable" },
  });
  const text = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(createObjectURL.mock.calls[0][0]); });
  const xml = new DOMParser().parseFromString(text, "application/xml");
  expect(xml.querySelector("parsererror")).toBeNull();
  const ns = "urn:schemas-microsoft-com:office:spreadsheet";
  const rows = [...xml.getElementsByTagNameNS(ns, "Row")];
  const cells = (label) => [...rows.find((row) => row.firstElementChild?.textContent === label).children];
  expect(cells("ORD-LAST")).toHaveLength(3);
  expect(cells("ORD-FIRST")[1].textContent).toBe("21 Nov 2026, 08:00 GMT+8");
  expect(cells("ORD-LAST")[2].getAttributeNS(ns, "StyleID")).toBe("currency");
  expect(cells("SKU-ONE")[2].getAttributeNS(ns, "StyleID")).toBe("integer");
  expect(cells("Cavite Technician")[2].getAttributeNS(ns, "StyleID")).toBe("percent");
  expect(Number(cells("Cavite Technician")[2].textContent)).toBeCloseTo(0.6667);
  for (const label of ["Product sales summary", "Technician performance", "Average completion time (hours)", "Verified report records", "Analysis is unavailable"]) expect(xml.documentElement.textContent).toContain(label);
});
