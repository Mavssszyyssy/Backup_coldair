import fs from "node:fs";
import path from "node:path";
import { act, render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { useUser } from "../../context/UserContext";
import ManagerAmpDashboard, { buildFollowUpSummary } from "./ManagerAmpDashboard";
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

it("reconciles follow-up totals across status, service, and branch distributions", () => {
  const summary = buildFollowUpSummary({
    pagination: { total: 6 },
    branchSummary: [
      { branch: "Bulacan", total: 2, upcoming: 1, overdue: 1 },
      { branch: "Cavite", total: 4, upcoming: 3, overdue: 1 },
    ],
    actionSummary: {
      serviceDemand: [
        { serviceType: "inspection", count: 3 },
        { serviceType: "repair", count: 1 },
        { serviceType: "regular_cleaning", count: 2 },
      ],
    },
    isCompanyWide: true,
  });

  expect(summary).toMatchObject({
    total: 6,
    overdue: 2,
    upcoming: 4,
    serviceTotal: 6,
    branchTotal: 6,
    isReconciled: true,
  });
  expect(summary.services.map(({ serviceType, count }) => [serviceType, count])).toEqual([
    ["inspection", 3],
    ["repair", 1],
    ["regular_cleaning", 2],
    ["deep_cleaning", 0],
  ]);
});

it("scopes the follow-up summary to the selected branch", () => {
  const summary = buildFollowUpSummary({
    pagination: { total: 4 },
    branchSummary: [
      { branch: "Bulacan", total: 2, upcoming: 1, overdue: 1 },
      { branch: "Cavite", total: 4, upcoming: 3, overdue: 1 },
    ],
    actionSummary: { serviceDemand: [{ serviceType: "inspection", count: 4 }] },
    selectedBranch: "Cavite",
    isCompanyWide: true,
  });

  expect(summary.branchDistribution).toEqual([{ branch: "Cavite", total: 4, upcoming: 3, overdue: 1 }]);
  expect(summary).toMatchObject({ total: 4, overdue: 1, upcoming: 3, branchTotal: 4, serviceTotal: 4, isReconciled: true });
});

it("keeps recommendation cards compact in the AMP grid", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "AMP", "styles.css"), "utf8");

  expect(css).toMatch(/\.amp-action-grid\s*\{[^}]*align-items:\s*start/s);
  expect(css).toMatch(/\.amp-action-item\s*\{[^}]*align-self:\s*start/s);
});

it("uses the calm AMP visual system across navigation, reports, history, and owner planning", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "AMP", "styles.css"), "utf8");
  const shell = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "AMP", "AmpDashboardShell.js"), "utf8");
  const owner = fs.readFileSync(path.resolve(process.cwd(), "src", "components", "AMP", "OwnerAmpDashboard.js"), "utf8");

  expect(shell).toContain("amp-user-chip");
  expect(shell).toContain("amp-brand-mark");
  expect(owner).toContain("amp-owner-branch-grid");
  expect(owner).toContain("amp-insight-details");
  expect(css).toMatch(/\.amp-report-controls\s*\{[^}]*grid-template-columns:/s);
  expect(css).toMatch(/\.amp-report-controls\s*\{\s*display:\s*flex;\s*flex-wrap:\s*wrap;/s);
  expect(css).toMatch(/\.amp-report-result\s*\{[^}]*border-radius:/s);
  expect(css).toContain(".amp-insight-details > summary");
  expect(css).toContain(".amp-owner-branch-grid");
  expect(css).toContain("Calm, business-focused AMP presentation");
});

it("explains branch admin follow-up without exposing company-wide controls", async () => {
  show(<ManagerAmpDashboard />);
  expect(await screen.findByText(/No units are entering/)).toBeVisible();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My branch maintenance");
  expect(screen.queryByRole("combobox", { name: "Branch" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "12-month workload plan" })).not.toBeInTheDocument();
  expect(screen.getByText("Completed services by AC model")).not.toBeVisible();
  fireEvent.click(screen.getByText("Past service and parts records"));
  expect(screen.getByText("Completed services by AC model")).toBeVisible();
});

it("keeps Superadmin branch and service-window filters working with clearer labels", async () => {
  useUser.mockReturnValue({ userRole: "superadmin", user: { role: "superadmin" }, logout: vi.fn() });
  show(<ManagerAmpDashboard />);
  expect(await screen.findByText(/No units are entering/)).toBeVisible();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Branch maintenance");
  expect(screen.queryByText("Branch service overview")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: /Branch \(including branches with no due units\)/ }), { target: { value: "Bulacan" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Service window" }), { target: { value: "90" } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90&page=1&pageSize=10&branch=Bulacan"));
  expect(screen.getByRole("link", { name: "12-month workload plan" })).toBeVisible();
});

it("uses the saved Filipino preference for AMP navigation, filters, and follow-up actions", async () => {
  useUser.mockReturnValue({ userRole: "superadmin", currentLanguage: "Filipino", user: { role: "superadmin" }, logout: vi.fn() });
  show(<ManagerAmpDashboard />);
  expect(await screen.findByRole("heading", { level: 1, name: "Maintenance ng mga branch" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Plano ng gawain sa 12 buwan" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Panahon ng serbisyo" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Distribusyon ng mga branch" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Inirerekomendang follow-up" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Tingnan ang detalye" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Uri ng ulat" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Naka-install na AC unit" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Tingnan ang ulat" })).toBeVisible();
});

it("shows a reconciled, interactive Superadmin follow-up summary", async () => {
  useUser.mockReturnValue({ userRole: "superadmin", user: { role: "superadmin" }, logout: vi.fn() });
  apiRequest.mockImplementation(async path => path.includes("pipeline") ? {
    units: [],
    pagination: { page: 1, pageSize: 10, total: path.includes("branch=Cavite") ? 4 : 6, totalPages: 1 },
    branchSummary: [
      { branch: "Bulacan", total: 2, upcoming: 1, overdue: 1 },
      { branch: "Cavite", total: 4, upcoming: 3, overdue: 1 },
    ],
    actionSummary: {
      serviceDemand: path.includes("branch=Cavite")
        ? [{ serviceType: "inspection", count: 4 }]
        : [{ serviceType: "inspection", count: 4 }, { serviceType: "repair", count: 2 }],
    },
  } : { units: [] });

  show(<ManagerAmpDashboard />);

  expect(await screen.findByRole("heading", { name: "Units needing attention" })).toBeVisible();
  expect(screen.getByText("All totals match")).toBeVisible();
  expect(screen.getByText("6 units: 2 overdue and 4 upcoming")).toBeVisible();
  expect(screen.getByText("6 units grouped by service type")).toBeVisible();
  expect(screen.getByText("6 units assigned to branches")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Filter follow-up units to Cavite" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=30&page=1&pageSize=10&branch=Cavite"));
  expect(await screen.findByText("4 units: 1 overdue and 3 upcoming")).toBeVisible();
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
  expect(screen.getByText("Estimated service value")).toBeVisible();
  expect(screen.getByText("This is an estimate, not earned revenue.")).toBeVisible();
  expect(screen.getByText("Current service needs")).toBeVisible();
  expect(screen.getByText("No suggested services have an estimated value in this period.")).toBeVisible();
});

it("renders the 12-month workload before the AC selector and defers hidden history", async () => {
  useUser.mockReturnValue({ userRole: "superadmin", user: { role: "superadmin" }, logout: vi.fn() });
  let resolveReportUnits;
  const reportUnitsRequest = new Promise((resolve) => { resolveReportUnits = resolve; });
  apiRequest.mockImplementation((requestPath) => {
    if (requestPath === "/amp/report-units") return reportUnitsRequest;
    if (requestPath.includes("includeHistory=true")) return Promise.resolve({
      recordedPartsTrend: [{ component: "Control Board", count: 1 }],
      modelTrends: [],
      brandTrends: [],
    });
    return Promise.resolve({
      forecast: [{ month: "2026-09", label: "Sep 2026", serviceVolume: 2, projectedRevenue: 5000 }],
      totalForecastedServices: 2,
      branchMaintenanceVolume: [{ branch: "Bulacan", upcomingServices: 2 }],
      recommendedServiceDemand: [{ serviceType: "regular_cleaning", count: 2 }],
    });
  });

  show(<OwnerAmpDashboard />);

  expect((await screen.findAllByText("Sep 2026"))[0]).toBeVisible();
  expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Loading installed AC units");
  expect(apiRequest).toHaveBeenCalledWith("/amp/owner/forecast?months=12&includeHistory=false");
  expect(apiRequest).not.toHaveBeenCalledWith("/amp/owner/forecast?months=12&includeHistory=true");

  expect(screen.getByText("Current service needs")).toBeVisible();
  fireEvent.click(screen.getByText("Recorded parts history"));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/owner/forecast?months=12&includeHistory=true"));
  expect(await screen.findByText("Control Board")).toBeVisible();

  await act(async () => resolveReportUnits({ units: [] }));
});

it("shows exact estimated values immediately without mixing them into paid revenue", async () => {
  apiRequest.mockImplementation(async (path) => path === '/amp/report-units' ? { units: [] } : {
    forecast: [{ month: '2026-09', label: 'Sep 2026', serviceVolume: 2, projectedRevenue: 5000 }],
    totalForecastedServices: 2,
    totalProjectedRevenue: 5000,
    averageServiceRevenue: 2500,
    revenueDisclaimer: 'Planning scenario only.',
  });
  show(<OwnerAmpDashboard />);
  expect(await screen.findByText('Planning scenario only.')).toBeVisible();
  expect(screen.getByText('Projected 12-month value').parentElement).toHaveTextContent('₱5,000');
  expect(screen.getByText('Planning amount per suggested service').parentElement).toHaveTextContent('₱2,500');
  expect(screen.getByRole('table', { name: /Months with suggested services/ })).toHaveTextContent('₱5,000');
  expect(screen.getByRole('listitem', { name: /Sep 2026: 2 suggested services; estimated value ₱5,000/ })).toBeInTheDocument();
  expect(apiRequest).not.toHaveBeenCalledWith('/amp/owner/forecast?months=12&includeHistory=true');
});

it("loads optional model history only when that panel is opened directly", async () => {
  apiRequest.mockImplementation(async (path) => path.includes('includeHistory=true')
    ? { recordedPartsTrend: [], modelTrends: [{ label: 'AC One', recordedServices: 2, servicesPerUnit: 1 }], brandTrends: [] }
    : { units: [], forecast: [], recommendedServiceDemand: [] });
  show(<OwnerAmpDashboard />);
  expect(apiRequest).not.toHaveBeenCalledWith('/amp/owner/forecast?months=12&includeHistory=true');
  fireEvent.click(screen.getByText('Service records by model and brand'));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/amp/owner/forecast?months=12&includeHistory=true'));
  expect(await screen.findByText('AC One')).toBeVisible();
});

it("gives branch admins a service-window control without cross-branch access", async () => {
  show(<ManagerAmpDashboard />);
  await screen.findByText(/No units are entering/);
  fireEvent.change(screen.getByRole("combobox", { name: "Service window" }), { target: { value: "90" } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90&page=1&pageSize=10"));
  expect(screen.getByText("About this maintenance list")).toBeVisible();
  expect(screen.getByText(/Dates are suggestions only/)).toBeVisible();
});

it("loads later maintenance pipeline pages without hiding the total", async () => {
  apiRequest.mockImplementation(async path => path.includes("pipeline")
    ? { units: [], pagination: { page: path.includes("page=2") ? 2 : 1, pageSize: 10, total: 75, totalPages: 8 } }
    : { units: [] });
  show(<ManagerAmpDashboard />);
  expect(await screen.findByText("Page 1 of 8 · 75 units")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=30&page=2&pageSize=10"));
  expect(await screen.findByText("Page 2 of 8 · 75 units")).toBeVisible();
});

it("keeps follow-up rows compact and opens the full assessment in a closable dialog", async () => {
  apiRequest.mockImplementation(async path => path.includes("pipeline") ? { units: [{
    unitId: "unit-1", modelName: "Samsung Windfree", customerName: "Edrian Mab",
    bestServicedBy: "2026-10-28", daysUntilDue: 1,
    technicianRecorded: "Original technician findings remain available.",
    aiAssessment: "A detailed interpretation of the recorded issue.",
    possibleCauses: ["Inspect the control board connection."],
    recommendedActions: ["Confirm the fault before replacement."],
  }] } : { units: [] });
  show(<ManagerAmpDashboard />);
  const open = await screen.findByRole("button", { name: "View details" });
  expect(screen.queryByRole("dialog", { name: /Maintenance assessment/ })).not.toBeInTheDocument();
  fireEvent.click(open);
  const dialog = screen.getByRole("dialog", { name: /Maintenance assessment/ });
  expect(dialog).toHaveTextContent("Original technician findings remain available.");
  expect(dialog).toHaveTextContent("Inspect the control board connection.");
  expect(dialog).toHaveTextContent("Confirm the fault before replacement.");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: /Maintenance assessment/ })).not.toBeInTheDocument();
  expect(open).toHaveFocus();
});

it("filters report units by customer and searches a long unit list", async () => {
  const units = Array.from({ length: 12 }, (_, index) => ({
    unitId: `unit-${index + 1}`, modelName: `Model ${index + 1}`,
    serialNumber: `SERIAL-${index + 1}`, customerName: index < 6 ? "Alice" : "Bob",
  }));
  apiRequest.mockImplementation(async path => path.includes("pipeline") ? { units: [] } : { units });
  show(<ManagerAmpDashboard />);
  await screen.findByRole("option", { name: /Alice · Model 1/ });
  fireEvent.change(screen.getByRole("combobox", { name: "Customer name" }), { target: { value: "Bob" } });
  expect(screen.queryByRole("option", { name: /Alice · Model 1/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox", { name: "Find installed AC unit" }), { target: { value: "SERIAL-12" } });
  expect(screen.getByRole("option", { name: /Model 12 · SERIAL-12/ })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Model 11 · SERIAL-11/ })).not.toBeInTheDocument();
});

it("does not mix installed units belonging to customers with the same name", async () => {
  const units = [
    { unitId: "unit-alice-1", customerId: "customer-111111", customerName: "Alex Cruz", modelName: "Model A", serialNumber: "SERIAL-A" },
    { unitId: "unit-alice-2", customerId: "customer-222222", customerName: "Alex Cruz", modelName: "Model B", serialNumber: "SERIAL-B" },
  ];
  apiRequest.mockImplementation(async path => path.includes("pipeline") ? { units: [] } : { units });
  show(<ManagerAmpDashboard />);
  await screen.findByRole("option", { name: /Alex Cruz · 111111/ });
  fireEvent.change(screen.getByRole("combobox", { name: "Customer name" }), { target: { value: "customer-111111" } });
  expect(screen.getByRole("option", { name: /Model A · SERIAL-A/ })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Model B · SERIAL-B/ })).not.toBeInTheDocument();
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

  expect(await screen.findByRole("heading", { name: "Recommended follow-up" })).toBeVisible();
  expect(screen.getByText("Prepare upcoming customer follow-ups")).toBeVisible();
  expect(screen.getByText("Review units marked for repair")).toBeVisible();
  expect(screen.getAllByRole("button", { name: "See details" }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Review Samsung Windfree 1.5")).toBeVisible();
  const trigger = screen.getByRole("heading", { name: "Review Samsung Windfree 1.5" }).closest("article").querySelector("button");
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog", { name: "Review Samsung Windfree 1.5" })).toHaveTextContent("Overdue");
  expect(screen.getAllByText("What the records suggest").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Technician notes").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Work already completed")).toBeVisible();
  expect(screen.getByText("Customer observation")).toBeVisible();
  expect(screen.getByText("Follow-up details")).toBeVisible();
  expect(screen.getAllByText("Next step").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/The technician recorded signs of control-board failure/i)).toBeVisible();
  expect(screen.getByText(/Button controls were not working properly/i)).toBeVisible();
  expect(screen.getByText(/Cleaned the air filter/i)).toBeVisible();
  expect(screen.getByText(/Arrange a qualified technician assessment before approving replacement/i)).toBeVisible();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Review Samsung Windfree 1.5" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
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
  fireEvent.click(screen.getByRole("button", { name: "View report" }));
  expect(await screen.findByText("Suggested from service history")).toBeVisible();
  await waitFor(() => expect(pipelineReads).toBe(2));
  expect(generations).toBe(1);
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeVisible();
});
