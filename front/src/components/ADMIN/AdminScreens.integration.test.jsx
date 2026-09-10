import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminDashboard from "./Dashboard/AdminDashboard";
import AdminInventory from "./Inventory/AdminInventory";
import AdminProfile from "./Profile/AdminProfile";
import AdminReports from "./Reports/AdminReports";
import AdminServices from "./Services/AdminServices";
import AdminSettings from "./Settings/AdminSettings";

const apiRequest = vi.fn();
const logout = vi.fn();
const updateProfile = vi.fn();
const changePassword = vi.fn();
const saveSettings = vi.fn();

vi.mock("../../config/api", () => ({
  apiRequest: (...args) => apiRequest(...args),
}));

vi.mock("../../context/UserContext", () => ({
  useUser: () => ({
    user: {
      id: "admin-test",
      name: "Cavite Admin",
      email: "admin@test.local",
      role: "admin",
      activeBranch: "Cavite",
      assignedBranch: "Cavite",
    },
    logout,
    updateProfile,
    changePassword,
  }),
}));

vi.mock("../../context/AdminSettingsContext", () => ({
  useAdminSettings: () => ({
    settings: {
      general: { storeName: "AeroPulse", address: "", taxRate: 0, currency: "PHP" },
      notifications: { lowStockThreshold: 5 },
      roles: { adminMode: "full" },
    },
    saveSettings,
  }),
}));

beforeEach(() => {
  apiRequest.mockImplementation(async (path) => {
    if (path === "/dashboard/me") return { stats: {}, analytics: {} };
    if (path.startsWith("/products/low-stock")) return { products: [] };
    if (path.startsWith("/products")) return { products: [] };
    if (path.startsWith("/orders")) return { orders: [], summary: { pendingOrders: 0 } };
    if (path.startsWith("/tasks")) return { tasks: [] };
    if (path.startsWith("/users?role=technician")) return { users: [] };
    if (path.startsWith("/notifications")) return { notifications: [] };
    if (path === "/service-requests") return { requests: [] };
    if (path === "/warranties/claims") return { claims: [] };
    if (path === "/contact-messages") return { messages: [] };
    if (path === "/reorders/mine") return { reorders: [] };
    return {};
  });
});

afterEach(() => cleanup());

const renderScreen = (Component, entry) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Component />
  </MemoryRouter>,
);

it.each([
  ["dashboard", AdminDashboard, "/admin/dashboard", "Commerce analytics"],
  ["inventory", AdminInventory, "/admin/inventory", "Inventory Management"],
  ["services", AdminServices, "/admin/services", "Services"],
  ["reports", AdminReports, "/admin/reports", "Reports"],
  ["settings", AdminSettings, "/admin/settings", "Settings"],
  ["profile", AdminProfile, "/admin/profile", "Admin Profile"],
])("renders the real Admin %s screen", (_name, Component, entry, heading) => {
  renderScreen(Component, entry);
  expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
});

it.each([
  ["reorder", "/admin/inventory?tab=reorder", "Create reorder request"],
  ["serial registry", "/admin/inventory?tab=serial-qr", "AC Unit QR Registry"],
  ["service requests", "/admin/services?tab=service-requests", "Requests"],
  ["technicians", "/admin/services?tab=technicians", "Find a technician"],
  ["customer messages", "/admin/services?tab=customer-messages", "Customer Messages"],
])("renders the real Admin %s module", async (_name, entry, heading) => {
  const Component = entry.startsWith("/admin/inventory") ? AdminInventory : AdminServices;
  renderScreen(Component, entry);
  if (_name === "customer messages") {
    expect(screen.getByRole("tab", { name: heading })).toHaveAttribute("aria-selected", "true");
  } else {
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  }
  await waitFor(() => expect(apiRequest).toHaveBeenCalled());
});
