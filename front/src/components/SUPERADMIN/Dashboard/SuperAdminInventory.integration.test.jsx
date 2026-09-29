import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import SuperAdminInventory from "./SuperAdminInventory";

const apiRequest = vi.fn();

vi.mock("../../../config/api", () => ({
  apiRequest: (...args) => apiRequest(...args),
}));
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({
    user: { id: "superadmin-test", name: "Super Admin", role: "superadmin" },
    logout: vi.fn(),
  }),
}));

beforeEach(() => {
  apiRequest.mockImplementation(async (path) => {
    if (path === "/products") return { products: [] };
    if (path === "/reorders") return { reorders: [] };
    if (path.startsWith("/notifications")) return { notifications: [] };
    return {};
  });
});

const renderInventory = (entry) => render(
  <MemoryRouter initialEntries={[entry]}>
    <SuperAdminInventory />
  </MemoryRouter>,
);

it("renders the real Superadmin layout and product catalog", () => {
  renderInventory("/superadmin/inventory");

  expect(screen.getByRole("heading", { name: "Inventory Management" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Add a product and its first stock" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add product and generate serials" })).toBeInTheDocument();
});

it("renders the real checker, serial registry, and reorder panels", async () => {
  const checker = renderInventory("/superadmin/inventory?tab=checker");
  expect(await screen.findByRole("heading", { name: "Inventory List" })).toBeInTheDocument();
  checker.unmount();

  const serials = renderInventory("/superadmin/inventory?tab=serial-qr");
  expect(await screen.findByRole("heading", { name: "AC Unit QR Registry" })).toBeInTheDocument();
  serials.unmount();

  renderInventory("/superadmin/inventory?tab=reorders");
  expect(await screen.findByRole("heading", { name: "Reorder queue" })).toBeInTheDocument();
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/reorders"));
});

it("presents a pending reorder as a structured review card", async () => {
  apiRequest.mockImplementation(async (path) => {
    if (path === "/products") return { products: [] };
    if (path === "/reorders") return {
      reorders: [{
        id: "reorder-1",
        status: "submitted",
        quantity: 3,
        branch: "Bulacan",
        notes: "Please replenish before the next installation.",
        createdAt: "2026-09-25T00:23:58.000Z",
        product: { name: "American Home Inverter", specs: "1 HP" },
        requestedBy: { name: "Bulacan Admin" },
      }],
    };
    if (path.startsWith("/notifications")) return { notifications: [] };
    return {};
  });

  renderInventory("/superadmin/inventory?tab=reorders");

  expect(await screen.findByText("American Home Inverter")).toBeInTheDocument();
  expect(document.querySelector(".reorder-status")).toHaveTextContent("Awaiting review");
  expect(screen.getByLabelText("Decision note Optional")).toHaveAttribute("placeholder", "Add context for the branch administrator");
  expect(screen.getByRole("button", { name: "Approve & Add Stock" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reject request" })).toBeInTheDocument();
});
