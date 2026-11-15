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
  }));
  expect(downloadElementPdf.mock.calls[0][0].element.nodeType).toBe(1);
  expect(downloadElementPdf.mock.calls[0][0].element.innerHTML).toContain("Order");
  expect(open).not.toHaveBeenCalled();
  expect(print).not.toHaveBeenCalled();
  expect(document.querySelector('iframe[title="PDF export renderer"]')).toBeNull();
});
