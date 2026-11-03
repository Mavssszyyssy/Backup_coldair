import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import SuperAdminDashboard from "./SuperAdminDashboard";

vi.mock("../Common/SuperAdminLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../../context/UserContext", () => ({ useUser: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue({ stats: {}, analytics: {} });
});

test("executive profile limits the Superadmin phone field to 11 digits and saves it", async () => {
  const updateProfile = vi.fn().mockResolvedValue({});
  useUser.mockReturnValue({
    user: { name: "Super Admin", phone: "09123456789", address: "Plaridel, Bulacan" },
    updateProfile,
  });

  render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Edit executive profile" }));

  const phoneInput = screen.getByRole("textbox", { name: "Phone number" });
  expect(phoneInput).toHaveAttribute("maxlength", "11");
  fireEvent.change(phoneInput, { target: { value: "09789654322888" } });
  expect(phoneInput).toHaveValue("09789654322");

  fireEvent.change(phoneInput, { target: { value: "09123456789" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phone: "09123456789" })));
});

test("keeps branch and period controls together while applying and clearing a validated date range", async () => {
  useUser.mockReturnValue({ user: { name: "Super Admin" }, updateProfile: vi.fn() });
  apiRequest.mockImplementation(async (path) => path === "/branches"
    ? { branches: [{ name: "Bulacan" }] }
    : { stats: { totalOrders: 0, cancelledOrders: 0, customerAcquisitionTotal: 0 }, analytics: { orderStages: [], customerAcquisition: [] } });
  render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
  const filters = screen.getByRole("form", { name: "Dashboard filters" });
  await screen.findByRole("option", { name: "Bulacan" });
  fireEvent.change(screen.getByRole("combobox", { name: "Branch" }), { target: { value: "Bulacan" } });
  fireEvent.click(screen.getByRole("button", { name: "Custom range" }));
  expect(filters).toContainElement(screen.getByLabelText("From Date"));
  fireEvent.click(screen.getByRole("button", { name: "Apply range" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Select both From and To dates.");
  fireEvent.change(screen.getByLabelText("From Date"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText("To Date"), { target: { value: "2026-01-31" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply range" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/dashboard/me?branch=Bulacan&from=2026-01-01&to=2026-01-31"));
  expect(screen.getByRole("combobox", { name: "Branch" })).toHaveValue("Bulacan");
  fireEvent.click(screen.getByRole("button", { name: "Clear range" }));
  expect(screen.getByRole("combobox", { name: "Branch" })).toHaveValue("Bulacan");
  fireEvent.click(screen.getByRole("button", { name: "daily" }));
  expect(screen.queryByLabelText("From Date")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "daily" })).toHaveAttribute("aria-pressed", "true");
});

test("flags an inconsistent response instead of silently presenting contradictory totals", async () => {
  useUser.mockReturnValue({ user: { name: "Super Admin" }, updateProfile: vi.fn() });
  apiRequest.mockImplementation(async (path) => path === "/branches" ? { branches: [] } : {
    stats: { totalOrders: 0, cancelledOrders: 0, customerAcquisitionTotal: 0 },
    analytics: { orderStages: [{ key: "cancelled", label: "Cancelled", count: 46 }], customerAcquisition: [{ key: "other", label: "Other (recorded)", count: 30 }] },
  });
  render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Analytics totals do not match the breakdown");
  expect(screen.getByText(/30 customers in the chart/)).toBeVisible();
});

test("identifies a stale API contract separately from a genuine analytics mismatch", async () => {
  useUser.mockReturnValue({ user: { name: "Super Admin" }, updateProfile: vi.fn() });
  apiRequest.mockImplementation(async (path) => path === "/branches" ? { branches: [] } : {
    stats: { totalOrders: 85 },
    analytics: { orderStages: [{ key: "complete", count: 40 }, { key: "to_install", count: 45 }], customerAcquisition: [] },
  });
  render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
  expect(await screen.findByRole("alert")).toHaveTextContent("dashboard API response is missing reconciliation fields");
  expect(screen.queryByText(/Analytics totals do not match the breakdown/)).not.toBeInTheDocument();
});
