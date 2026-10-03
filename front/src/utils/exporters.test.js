import { afterEach, expect, it, vi } from "vitest";
import { exportHtmlToPdfViaPrint } from "./exporters";

afterEach(() => {
  vi.restoreAllMocks();
});

it("keeps the print footer in normal document flow so it cannot overlap report rows", () => {
  const document = {
    open: vi.fn(),
    write: vi.fn(),
    close: vi.fn(),
  };
  const printWindow = { document, focus: vi.fn(), print: vi.fn(), opener: window };
  vi.spyOn(window, "open").mockReturnValue(printWindow);

  exportHtmlToPdfViaPrint({
    title: "Sales Report",
    html: '<section class="report-page"><table><tr><td>Order</td></tr></table></section>',
    metadata: { documentStyle: "tabular", pageOrientation: "landscape" },
  });

  const output = document.write.mock.calls[0][0];
  expect(output).toContain("report-document--tabular");
  expect(output).toContain(".report-footer { position: static;");
  expect(output).not.toContain(".report-footer { position: fixed;");
});
