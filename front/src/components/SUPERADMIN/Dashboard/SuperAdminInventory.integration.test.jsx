import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import SuperAdminInventory from "./SuperAdminInventory";

const apiRequest = vi.fn();
let currentLanguage = "English";

vi.mock("../../../config/api", () => ({
  apiRequest: (...args) => apiRequest(...args),
}));
vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({
    user: { id: "superadmin-test", name: "Super Admin", role: "superadmin" },
    currentLanguage,
    logout: vi.fn(),
  }),
}));

beforeEach(() => {
  currentLanguage = "English";
  apiRequest.mockImplementation(async (path) => {
    if (path === "/products") return { products: [] };
    if (path === "/reorders") return { reorders: [] };
    if (path.startsWith("/notifications")) return { notifications: [] };
    return {};
  });
});

it("localizes the Super Admin inventory shell without changing product or branch names", async () => {
  currentLanguage = "Filipino";
  apiRequest.mockImplementation(async (path) => {
    if (path === "/products") return { products: [{ id: "unit-1", name: "American Home Inverter", sku: "AH-1", branchStock: { Bulacan: 0 } }] };
    if (path.startsWith("/notifications")) return { notifications: [] };
    return {};
  });
  renderInventory("/superadmin/inventory?tab=checker");
  expect(screen.getByRole("heading", { name: "Pamamahala ng Imbentaryo" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Taga-check ng Imbentaryo" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Maghanap sa imbentaryo" })).toBeInTheDocument();
  expect((await screen.findAllByText("American Home Inverter")).length).toBeGreaterThan(0);
});

it("localizes the reorder queue controls in Filipino", async () => {
  currentLanguage = "Filipino";
  renderInventory("/superadmin/inventory?tab=reorders");
  expect(await screen.findByRole("heading", { name: "Talaan ng muling pag-order" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Salain ang talaan ng muling pag-order" })).toBeInTheDocument();
});

const renderInventory = (entry) => render(
  <MemoryRouter initialEntries={[entry]}>
    <SuperAdminInventory />
  </MemoryRouter>,
);

it("renders the real Superadmin layout and product catalog", () => {
  renderInventory("/superadmin/inventory");

  expect(screen.getByRole("heading", { name: "Inventory Management" })).toBeInTheDocument();
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
    "Catalog Management",
    "Inventory Checker",
    "Reorder Management",
    "Serial / QR Registry",
  ]);
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

it("takes an inventory row directly to its unit records in the selected branch", async () => {
  apiRequest.mockImplementation(async (path) => path === "/products" ? { products: [
    { id: "p1", name: "Selected AC", sku: "AC-1", branchStock: { Bulacan: 1 }, serialUnits: [
      { serialNumber: "SERIAL-B", branch: "Bulacan", status: "available" },
      { serialNumber: "SERIAL-C", branch: "Cavite", status: "sold" },
    ] },
    { id: "p2", name: "Other AC", sku: "AC-2", branchStock: { Bulacan: 1 }, serialUnits: [
      { serialNumber: "OTHER-B", branch: "Bulacan", status: "available" },
    ] },
  ] } : {});
  renderInventory("/superadmin/inventory?tab=checker");
  fireEvent.click(await screen.findByRole("link", { name: /View unit records: Selected AC/ }));
  expect(await screen.findByRole("heading", { name: "Selected AC" })).toHaveFocus();
  expect(screen.getByText("SERIAL-B")).toBeInTheDocument();
  expect(screen.queryByText("SERIAL-C")).not.toBeInTheDocument();
  expect(screen.queryByText("OTHER-B")).not.toBeInTheDocument();
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

it("paginates the reorder queue when large review cards would create a long page", async () => {
  const reorders = Array.from({ length: 5 }, (_, index) => ({
    id: `reorder-${index + 1}`,
    status: "submitted",
    quantity: index + 1,
    branch: "Cavite",
    createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    product: { name: `Reorder Product ${index + 1}`, specs: "1 HP" },
    requestedBy: { name: "Cavite Admin" },
  }));
  apiRequest.mockImplementation(async (path) => {
    if (path === "/products") return { products: [] };
    if (path === "/reorders") return { reorders };
    if (path.startsWith("/notifications")) return { notifications: [] };
    return {};
  });

  renderInventory("/superadmin/inventory?tab=reorders");
  expect(await screen.findByText("Reorder Product 1")).toBeInTheDocument();
  expect(screen.queryByText("Reorder Product 5")).not.toBeInTheDocument();
  expect(screen.getByText("Showing 1–4 of 5")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByText("Reorder Product 5")).toBeInTheDocument();
  expect(screen.queryByText("Reorder Product 1")).not.toBeInTheDocument();
});
