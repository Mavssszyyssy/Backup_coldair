import { afterEach, expect, it, vi } from "vitest";
import { exportHtmlToPdfViaPrint } from "./exporters";
import { downloadElementPdf } from "./pdfDownload";

vi.mock("./pdfDownload", () => ({ downloadElementPdf: vi.fn(async () => true) }));

afterEach(() => {
  vi.restoreAllMocks();
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
