import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const updateSettings = vi.fn();
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
      preferences: { currency: "PHP" },
      notifications: { email: true, inApp: true, push: true },
    },
    logout,
    updateProfile,
    changePassword,
    updateSettings,
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
  ["reports", AdminReports, "/admin/reports", "Analytics & Reports"],
  ["settings", AdminSettings, "/admin/settings", "System Settings"],
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
  ["daily schedule inside technicians", "/admin/services?tab=daily-schedule", "Daily work schedule"],
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

it("paginates branch reorder history and low-stock cards", async () => {
  const products = Array.from({ length: 7 }, (_, index) => ({ id: `product-${index + 1}`, name: `Low Stock ${index + 1}`, stock: index, threshold: 10, specs: "1 HP" }));
  const reorders = Array.from({ length: 7 }, (_, index) => ({ id: `reorder-${index + 1}`, status: "approved", quantity: 2, branch: "Cavite", createdAt: "2026-10-01T00:00:00.000Z", product: { name: `History Product ${index + 1}`, specs: "1 HP" } }));
  apiRequest.mockImplementation(async (path) => {
    if (path === "/products/low-stock") return { products };
    if (path === "/reorders/mine") return { reorders };
    if (path.startsWith("/notifications")) return { notifications: [] };
    return {};
  });

  renderScreen(AdminInventory, "/admin/inventory?tab=reorder");
  expect(await screen.findByText("Low Stock 1")).toBeInTheDocument();
  expect(screen.queryByText("Low Stock 7")).not.toBeInTheDocument();
  const lowStockPagination = screen.getByRole("navigation", { name: "Low stock items pagination" });
  fireEvent.click(within(lowStockPagination).getByRole("button", { name: "Next" }));
  expect(await screen.findByText("Low Stock 7")).toBeInTheDocument();

  expect(screen.getByText("History Product 1")).toBeInTheDocument();
  expect(screen.queryByText("History Product 7")).not.toBeInTheDocument();
  const historyPagination = screen.getByRole("navigation", { name: "Reorder request history pagination" });
  fireEvent.click(within(historyPagination).getByRole("button", { name: "Next" }));
  expect(await screen.findByText("History Product 7")).toBeInTheDocument();
});
