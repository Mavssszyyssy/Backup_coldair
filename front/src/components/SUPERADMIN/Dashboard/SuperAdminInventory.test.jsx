import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import SuperAdminInventory from "./SuperAdminInventory";

const apiRequest = vi.fn();

vi.mock("../../../config/api", () => ({
  apiRequest: (...args) => apiRequest(...args),
}));
vi.mock("../Common/SuperAdminLayout", () => ({
  default: ({ title, children }) => <main><h1>{title}</h1>{children}</main>,
}));
vi.mock("../../ADMIN/Inventory/InventoryList", () => ({
  default: () => <div>Inventory list loaded</div>,
}));
vi.mock("../../ADMIN/SerialQr/AdminSerialQr", () => ({
  default: () => <div>Serial registry loaded</div>,
}));
vi.mock("./SuperAdminCatalog", () => ({
  default: () => <div>Catalog form loaded</div>,
}));
vi.mock("./SuperAdminReorders", () => ({
  default: () => <div>Reorder approvals loaded</div>,
}));

beforeEach(() => {
  apiRequest.mockResolvedValue({ products: [] });
});

it("renders the default Superadmin Inventory catalog instead of a blank screen", async () => {
  render(<MemoryRouter initialEntries={["/superadmin/inventory"]}><SuperAdminInventory /></MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Inventory Management" })).toBeInTheDocument();
  expect(screen.getByText("Catalog form loaded")).toBeInTheDocument();
  expect(await screen.findByRole("tab", { name: "Shop Catalog" })).toHaveAttribute("aria-selected", "true");
});

it("opens each inventory sub-screen from its URL without losing the workspace", () => {
  apiRequest.mockReturnValueOnce(new Promise(() => {}));
  const checker = render(
    <MemoryRouter initialEntries={["/superadmin/inventory?tab=checker"]}>
      <SuperAdminInventory />
    </MemoryRouter>,
  );
  expect(screen.getByText("Inventory list loaded")).toBeInTheDocument();
  checker.unmount();

  render(
    <MemoryRouter initialEntries={["/superadmin/inventory?tab=serial-qr"]}>
      <SuperAdminInventory />
    </MemoryRouter>,
  );
  expect(screen.getByText("Serial registry loaded")).toBeInTheDocument();
});
