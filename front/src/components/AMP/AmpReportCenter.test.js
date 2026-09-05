import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AmpReportCenter from "./AmpReportCenter";
import ServiceHistory from "../myunit/ServiceHistory";
import { apiRequest } from "../../config/api";
import { exportHtmlToPdfViaPrint } from "../../utils/exporters";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ user: { role: "customer", name: "Customer Person" } }) }));
vi.mock("../../utils/exporters", () => ({ exportHtmlToPdfViaPrint: vi.fn() }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

it("shows actual history without crashing or inventing a fee when no price exists", () => {
  render(<ServiceHistory unit={{ brand: "Cold Air", model: "CA-1", serviceHistory: [
    { id: "1", date: "2026-09-05T16:30:00Z", serviceType: "repair", findings: "Control board failed inspection.", actionTaken: "Replaced control board." },
    { id: "2", date: "2026-09-01", serviceType: "installation" },
  ] }} onClose={vi.fn()} />);
  expect(screen.getByText("Repair")).toBeVisible();
  expect(screen.getByText("Installation")).toBeVisible();
  expect(screen.getByText(/Control board failed inspection/)).toHaveTextContent("Replaced control board.");
  expect(screen.getByText(/September 6, 2026/)).toBeVisible();
  expect(screen.queryByText(/₱/)).not.toBeInTheDocument();
});

it("retains evidence warnings in the report/PDF and clears the previous unit's export on selection change", async () => {
  apiRequest.mockResolvedValue({ provider: "rules", report: {
    title: "Next Maintenance Recommendation", reportId: "REPORT-1", branch: "Bulacan", generatedAt: "2026-09-05T12:00:00Z",
    unit: { unitId: "unit-1", model: "CA-1" },
    maintenance: { bestServicedBy: "2027-06-02", recommendationBasis: "Provisional schedule using the configured interval.", dataQuality: { message: "1 incomplete service record is excluded." } },
    serviceHistory: [{ date: "2026-09-05", type: "inspection", findings: "AMP recommended regular cleaning.", evidence: { eligible: false, reason: "Actual technician findings are missing." } }],
  } });
  render(<AmpReportCenter units={[{ id: "unit-1", model: "CA-1" }, { id: "unit-2", model: "CA-2" }]} />);
  expect(screen.queryByRole("option", { name: "Aggregate Recorded Service Analysis" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Installed AC unit"), { target: { value: "unit-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  await screen.findByRole("button", { name: "Export PDF" });
  expect(screen.getByText("Inspection")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("incomplete service record");
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  const exported = exportHtmlToPdfViaPrint.mock.calls[0][0];
  expect(exported.html).toContain("Actual technician findings are missing.");
  expect(exported.html).toContain("June 2, 2027");
  expect(exported.metadata.representative).toBe("");
  fireEvent.change(screen.getByLabelText("Installed AC unit"), { target: { value: "unit-2" } });
  expect(screen.queryByRole("button", { name: "Export PDF" })).not.toBeInTheDocument();
  expect(screen.queryByText("REPORT-1")).not.toBeInTheDocument();
});
