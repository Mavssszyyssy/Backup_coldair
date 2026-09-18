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
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90&page=1&pageSize=50&branch=Bulacan"));
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
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90&page=1&pageSize=50"));
  expect(screen.getByText(/Only completed cleaning-to-cleaning gaps form the interval pattern/)).toBeVisible();
  expect(screen.getByText(/With insufficient history, the system uses the 6-month baseline/)).toBeVisible();
});

it("loads later maintenance pipeline pages without hiding the total", async () => {
  apiRequest.mockImplementation(async path => path.includes("pipeline")
    ? { units: [], pagination: { page: path.includes("page=2") ? 2 : 1, pageSize: 50, total: 75, totalPages: 2 } }
    : { units: [] });
  show(<ManagerAmpDashboard />);
  expect(await screen.findByText("Page 1 of 2 · 75 units")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=30&page=2&pageSize=50"));
  expect(await screen.findByText("Page 2 of 2 · 75 units")).toBeVisible();
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

it("turns maintenance totals into data-backed management recommendations", async () => {
  apiRequest.mockImplementation(async path => path.includes("pipeline") ? {
    units: [{
      unitId: "unit-1",
      modelName: "Samsung Windfree 1.5",
      serialNumber: "CAACT-001",
      customerName: "Edrian Mab",
      bestServicedBy: "2026-09-28T00:00:00.000Z",
      daysUntilDue: 12,
      overdue: false,
      recommendedService: "repair",
    }],
    branchSummary: [{ branch: "Bulacan", total: 1, upcoming: 1, overdue: 0 }],
    actionSummary: {
      serviceDemand: [{ serviceType: "repair", count: 1, overdue: 0 }],
      priorityUnits: [{
        unitId: "unit-1",
        modelName: "Samsung Windfree 1.5",
        serialNumber: "CAACT-001",
        customerName: "Edrian Mab",
        bestServicedBy: "2026-09-28T00:00:00.000Z",
        recommendedService: "repair",
        affectedComponent: "control board",
        severity: "urgent",
        assessment: "The technician recorded signs of control-board failure.",
        technicianRecorded: "Button controls were not working properly.",
        workCompleted: "Cleaned the air filter.",
        customerObservation: "Customer reported intermittent controls.",
        recommendedActions: ["Arrange a qualified technician assessment before approving replacement."],
      }],
      earliestDueUnit: {
        unitId: "unit-1",
        modelName: "Samsung Windfree 1.5",
        serialNumber: "CAACT-001",
        customerName: "Edrian Mab",
        bestServicedBy: "2026-09-28T00:00:00.000Z",
        recommendedService: "repair",
      },
    },
  } : { units: [] });

  show(<ManagerAmpDashboard />);

  expect(await screen.findByRole("heading", { name: "What the branch should do next" })).toBeVisible();
  expect(screen.getByText("Prepare upcoming customer follow-ups")).toBeVisible();
  expect(screen.getByText("Review repair assessments")).toBeVisible();
  expect(screen.getByText(/verify the recorded technician findings/i)).toBeVisible();
  expect(screen.getByText("Unit action · Samsung Windfree 1.5")).toBeVisible();
  expect(screen.getByText("Assessment")).toBeVisible();
  expect(screen.getByText("Technician recorded")).toBeVisible();
  expect(screen.getByText("Work completed")).toBeVisible();
  expect(screen.getByText("Customer observation")).toBeVisible();
  expect(screen.getByText("Follow-up priority")).toBeVisible();
  expect(screen.getAllByText("Recommended action").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/The technician recorded signs of control-board failure/i)).toBeVisible();
  expect(screen.getByText(/Button controls were not working properly/i)).toBeVisible();
  expect(screen.getByText(/Cleaned the air filter/i)).toBeVisible();
  expect(screen.getByText(/Arrange a qualified technician assessment before approving replacement/i)).toBeVisible();
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
