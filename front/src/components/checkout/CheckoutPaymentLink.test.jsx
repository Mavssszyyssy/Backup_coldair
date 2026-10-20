import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Checkout from "./Checkout";
import { apiRequest } from "../../config/api";
import { openOnlineCheckout } from "../../domain/checkout/openOnlineCheckout";

const fixture = vi.hoisted(() => ({
  cart: [{ id: "p1", name: "AC", price: 100, quantity: 1 }],
  clearCart: vi.fn(),
  getCartTotal: () => 100,
  synchronizeAddresses: vi.fn(),
}));

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../domain/checkout/openOnlineCheckout", () => ({ openOnlineCheckout: vi.fn() }));
vi.mock("../../context/CartContext", () => ({ useCart: () => fixture }));
vi.mock("../../context/UserContext", () => ({ useUser: () => fixture }));
vi.mock("../../domain/branches/branchRouting", () => ({ resolveConfiguredBranch: async () => "Cavite" }));
vi.mock("../common/boutique/BoutiqueHeader", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueFooter", () => ({ default: () => null }));

const address = {
  id: "a1", label: "Home", name: "Test Customer", street: "Test street",
  city: "Bacoor", barangay: "Molino I", province: "Cavite", region: "CALABARZON",
  postalCode: "4102", phone: "09123456789", isDefault: true,
};

const renderCheckout = async (payment, orderError = null) => {
  apiRequest.mockImplementation(async (path) => {
    if (path === "/users/addresses") return { addresses: [address] };
    if (path.startsWith("/products/public")) return { products: [{ id: "p1", stock: 5 }] };
    if (path === "/orders") {
      if (orderError) throw orderError;
      return { order: { id: "order123" }, payment };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  render(
    <MemoryRouter initialEntries={["/checkout"]}>
      <Routes>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<div>Saved order confirmation</div>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("Test street");
  fireEvent.click(screen.getByText("GCash"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Place order" }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/orders", expect.objectContaining({ method: "POST" })));
};

beforeEach(() => {
  vi.clearAllMocks();
  openOnlineCheckout.mockReset();
  sessionStorage.clear();
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

it("shows a missing-link error and opens the saved order without launching payment", async () => {
  await renderCheckout(null);
  await screen.findByText("Saved order confirmation");
  expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/payment link is unavailable.*order was saved.*payment has not started/i));
  expect(openOnlineCheckout).not.toHaveBeenCalled();
  expect(fixture.clearCart).toHaveBeenCalledTimes(1);
});

it("shows the gateway error and keeps the cart when PayMongo cannot create a link", async () => {
  const gatewayError = Object.assign(
    new Error("Unable to start PayMongo checkout: PayMongo did not return a checkout URL."),
    { status: 502 },
  );
  await renderCheckout(null, gatewayError);
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith(gatewayError.message));
  expect(openOnlineCheckout).not.toHaveBeenCalled();
  expect(fixture.clearCart).not.toHaveBeenCalled();
});

it("shows an open failure without claiming the saved order was never created", async () => {
  openOnlineCheckout.mockImplementation(() => { throw new Error("This browser could not open the secure payment link."); });
  await renderCheckout({ checkoutUrl: "https://checkout.paymongo.com/test" });
  await screen.findByText("Saved order confirmation");
  expect(openOnlineCheckout).toHaveBeenCalledWith("https://checkout.paymongo.com/test", "order123");
  expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/could not open.*order was saved.*payment has not started/i));
  expect(window.alert).not.toHaveBeenCalledWith(expect.stringMatching(/no order or stock change was made/i));
  expect(fixture.clearCart).toHaveBeenCalledTimes(1);
});

it("continues to open a valid PayMongo test checkout link", async () => {
  await renderCheckout({ checkoutUrl: "https://checkout.paymongo.com/test" });
  await waitFor(() => expect(openOnlineCheckout).toHaveBeenCalledWith("https://checkout.paymongo.com/test", "order123"));
  expect(window.alert).not.toHaveBeenCalled();
  expect(fixture.clearCart).toHaveBeenCalledTimes(1);
});
