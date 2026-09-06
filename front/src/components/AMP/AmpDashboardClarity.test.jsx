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
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Customers due for AC service");
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
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Service follow-up across all branches");
  fireEvent.change(screen.getByRole("combobox", { name: "Branch", exact: true }), { target: { value: "Bulacan" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Service window" }), { target: { value: "90" } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/amp/manager/pipeline?days=90&branch=Bulacan"));
  expect(screen.getByRole("link", { name: "12-month workload plan" })).toBeVisible();
});

it.each([ManagerAmpDashboard, OwnerAmpDashboard])("does not present a failed request as zero workload", async (Dashboard) => {
  apiRequest.mockRejectedValue(new Error("Connection interrupted. Please try again."));
  show(<Dashboard />);
  expect(await screen.findByText("Connection interrupted. Please try again.")).toBeVisible();
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(3);
  expect(screen.queryByText(/No units are entering/)).not.toBeInTheDocument();
  expect(screen.queryByText("No maintenance demand is recorded yet.")).not.toBeInTheDocument();
});

it("does not invent a busiest month when no services are due", async () => {
  show(<OwnerAmpDashboard />);
  expect(await screen.findByText("No services due")).toBeVisible();
  expect(screen.getByText("Estimate only, not earned revenue")).toBeVisible();
  expect(screen.getByText("Scenario Revenue")).not.toBeVisible();
  fireEvent.click(screen.getByText("How the potential service value is calculated"));
  expect(screen.getByText("Scenario Revenue")).toBeVisible();
});
