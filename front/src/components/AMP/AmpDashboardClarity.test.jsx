import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import ManagerAmpDashboard from "./ManagerAmpDashboard";
import OwnerAmpDashboard from "./OwnerAmpDashboard";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../context/UserContext", () => ({ useUser: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  useUser.mockReturnValue({ userRole: "admin", user: { role: "admin", name: "Branch Admin" }, logout: vi.fn() });
  apiRequest.mockResolvedValue({ units: [], forecast: [{ month: "2026-09", label: "Sep 2026", serviceVolume: 0, projectedRevenue: 0 }] });
});
const show = (component) => render(<MemoryRouter>{component}</MemoryRouter>);

it("explains branch admin follow-up without exposing company-wide controls", async () => {
  show(<ManagerAmpDashboard />);
  expect(await screen.findByText(/No units are entering/)).toBeVisible();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AMP · My branch maintenance");
  expect(screen.queryByRole("combobox", { name: "Branch" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "12-month workload plan" })).not.toBeInTheDocument();
  expect(screen.getByText("Recorded cleaning by model")).not.toBeVisible();
  fireEvent.click(screen.getByText("Past cleaning and parts use"));
  expect(screen.getByText("Recorded cleaning by model")).toBeVisible();
});

it("keeps Superadmin branch and service-window filters working with clearer labels", async () => {
  useUser.mockReturnValue({ userRole: "superadmin", user: { role: "superadmin" }, logout: vi.fn() });
  show(<ManagerAmpDashboard />);
  expect(await screen.findByText(/No units are entering/)).toBeVisible();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AMP · Maintenance across branches");
  fireEvent.change(screen.getByRole("combobox", { name: "Branch", exact: true }), { target: { value: "Bulacan" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Service window" }), { target: { value: "90" } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90&branch=Bulacan"));
  expect(screen.getByRole("link", { name: "12-month workload plan" })).toBeVisible();
});

it.each([ManagerAmpDashboard, OwnerAmpDashboard])("does not present a failed request as zero workload", async (Dashboard) => {
  apiRequest.mockRejectedValue(new Error("Connection interrupted. Please try again."));
  show(<Dashboard />);
  expect(await screen.findByText("Connection interrupted. Please try again.")).toBeVisible();
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText(/No units are entering/)).not.toBeInTheDocument();
  expect(screen.queryByText("No maintenance demand is recorded yet.")).not.toBeInTheDocument();
});

it("does not invent a busiest month when no services are due", async () => {
  show(<OwnerAmpDashboard />);
  expect(await screen.findByText("No services due")).toBeVisible();
  expect(screen.getByText("Estimate only, not earned revenue")).not.toBeVisible();
  expect(screen.getByText("Scenario Revenue")).not.toBeVisible();
  fireEvent.click(screen.getByText("How the potential service value is calculated"));
  expect(screen.getByText("Scenario Revenue")).toBeVisible();
  expect(screen.getByText("Estimate only, not earned revenue")).toBeVisible();
});

it("gives branch admins a service-window control without cross-branch access", async () => {
  show(<ManagerAmpDashboard />);
  await screen.findByText(/No units are entering/);
  fireEvent.change(screen.getByRole("combobox", { name: "Service window" }), { target: { value: "90" } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90"));
  expect(screen.getByText(/Limited history uses a provisional schedule/)).toBeVisible();
  expect(screen.getByText(/Generate a service plan to ask AI for a servicing interval/)).toBeVisible();
});

it("opens the selected unit's plan without automatically calling AI", async () => {
  apiRequest.mockImplementation(async (path) => ({ units: path.includes("pipeline") ? [{ unitId: "unit-1", modelName: "Model A", bestServicedBy: "2026-09-08", daysUntilDue: 0, recommendationBasis: "Provisional schedule", recommendedService: "regular_cleaning" }] : [{ unitId: "unit-1", modelName: "Model A" }, { unitId: "unit-2", modelName: "Model B" }] }));
  show(<ManagerAmpDashboard />);
  await screen.findByText("Due today");
  fireEvent.click(screen.getByRole("link", { name: "Review service plan" }));
  expect(screen.getByLabelText("Installed AC unit")).toHaveValue("unit-1");
  fireEvent.change(screen.getByLabelText("Installed AC unit"), { target: { value: "unit-2" } });
  fireEvent.click(screen.getByRole("link", { name: "Review service plan" }));
  expect(screen.getByLabelText("Installed AC unit")).toHaveValue("unit-1");
  expect(apiRequest.mock.calls.some(([path]) => path === "/ai/amp-report")).toBe(false);
});

it("refreshes branch workload after a generated plan without making another paid request", async () => {
  let pipelineReads = 0;
  let generations = 0;
  apiRequest.mockImplementation(async path => {
    if (path === "/ai/amp-report") {
      generations++;
      return { provider: "openai", report: { reportType: "predictive_maintenance", reportId: "AI-PLAN", unit: { unitId: "unit-1" }, maintenance: { predictionSource: "openai", bestServicedBy: "2026-10-01", recommendationBasis: "AI-estimated servicing interval: 150 days." } } };
    }
    if (path.includes("pipeline")) {
      pipelineReads++;
      return { units: [] };
    }
    return { units: [{ unitId: "unit-1", modelName: "AC" }] };
  });
  show(<ManagerAmpDashboard />);
  await screen.findByRole("option", { name: "Customer name not recorded · AC · unit-1" });
  fireEvent.change(screen.getByLabelText("Installed AC unit"), { target: { value: "unit-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
  expect(await screen.findByText("AI-estimated servicing date")).toBeVisible();
  await waitFor(() => expect(pipelineReads).toBe(2));
  expect(generations).toBe(1);
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeVisible();
});
