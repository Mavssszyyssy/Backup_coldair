import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Shop from "./Shop";
import { apiRequest } from "../../config/api";
import { resolveConfiguredBranch } from "../../domain/branches/branchRouting";

const authState = vi.hoisted(() => ({ authenticated: false }));
const purchase = vi.hoisted(() => ({ navigate: vi.fn(), addToCart: vi.fn(), cart: [], search: "" }));
vi.mock("react-router-dom", async (original) => ({
  ...(await original()),
  useLocation: () => ({ search: purchase.search }),
  useNavigate: () => purchase.navigate,
}));
vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../domain/branches/branchRouting", () => ({ resolveConfiguredBranch: vi.fn().mockResolvedValue("Cavite") }));
vi.mock("../../context/CartContext", () => ({ useCart: () => ({
  cart: purchase.cart, addToCart: purchase.addToCart, updateQuantity: vi.fn(), removeFromCart: vi.fn(),
  getCartCount: () => 0, getCartTotal: () => 0,
}) }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({
  user: null, isAuthenticated: authState.authenticated, logout: vi.fn(),
  showAuthRequiredPrompt: vi.fn(), currentLanguage: "English",
}) }));
vi.mock("../common/boutique/BoutiqueScreen", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../common/boutique/BoutiqueBox", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../common/boutique/BoutiqueCart", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueFooter", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueHeader", () => ({ default: ({ subtitle }) => <div>{subtitle}</div> }));
vi.mock("../common/boutique/BoutiqueNotifications", () => ({ default: () => null }));
vi.mock("../common/boutique/BoutiqueSideMenu", () => ({ default: () => null }));
vi.mock("./ShopCatalogue", () => ({ default: ({ products, onBuyNow }) => (
  <>
    <ul aria-label="Catalog results">{products.map((product) => <li key={product.id}>{product.name}</li>)}</ul>
    {products.length > 0 && <button onClick={() => onBuyNow(products[0])}>Buy Now</button>}
  </>
) }));
vi.mock("./ShopSidebar", () => ({ default: ({ selectedBrands, onClearFilters, priceRange, onPriceChange }) => (
  <>
    <output aria-label="Selected brands">{selectedBrands.join(", ")}</output>
    <output aria-label="Price range">{priceRange.min} to {priceRange.max}</output>
    <button onClick={() => onPriceChange("min", 50000)}>Set minimum</button>
    <button onClick={() => onPriceChange("max", 1000)}>Set maximum below minimum</button>
    <button onClick={onClearFilters}>Clear filters</button>
  </>
) }));
vi.mock("./ProductModal", () => ({ default: () => null }));

beforeEach(() => {
  vi.useFakeTimers();
  apiRequest.mockReset();
  resolveConfiguredBranch.mockClear();
  authState.authenticated = false;
  purchase.cart = [];
  purchase.search = "";
  purchase.navigate.mockClear();
  purchase.addToCart.mockClear();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});
afterEach(() => vi.useRealTimers());

test("expands the price ceiling for expensive catalog items and prevents an inverted range", async () => {
  apiRequest.mockResolvedValue({ products: [
    { id: "p1", name: "Premium Floor Model", brand: "AUX", category: "floor", price: 125500.5, stock: 1 },
  ] });
  const view = render(<Shop />);
  await act(async () => {});
  const priceRange = view.getByLabelText("Price range");
  expect(priceRange).toHaveTextContent("0 to 126000");
  expect(view.getByText("Premium Floor Model")).toBeVisible();
  fireEvent.click(view.getByRole("button", { name: "Set minimum" }));
  fireEvent.click(view.getByRole("button", { name: "Set maximum below minimum" }));
  expect(priceRange).toHaveTextContent("50000 to 50000");
  fireEvent.click(view.getByRole("button", { name: "Clear filters" }));
  expect(view.getByText("Premium Floor Model")).toBeVisible();
});

test("shop reads linked brands case-insensitively and preserves an empty filtered result", async () => {
  purchase.search = "?brand=Aux";
  apiRequest.mockResolvedValue({ products: [
    { id: "aux1", name: "Freedom Plus", brand: "AUX", category: "split", price: 20000, stock: 1 },
    { id: "ah1", name: "American Home Inverter", brand: "American Home", category: "window", price: 20000, stock: 1 },
  ] });
  const view = render(<Shop />);
  const results = view.getByRole("list", { name: "Catalog results" });
  await act(async () => {});
  expect(results).toHaveTextContent("Freedom Plus");
  expect(results).not.toHaveTextContent("American Home Inverter");
  expect(view.getByLabelText("Selected brands")).toHaveTextContent("AUX");

  purchase.search = "?cat=window&brand=American+Home&brand=Aux";
  view.rerender(<Shop />);
  expect(results).toHaveTextContent("American Home Inverter");
  expect(results).not.toHaveTextContent("Freedom Plus");

  purchase.search = "?brand=Unavailable+Brand&ref=partners";
  view.rerender(<Shop />);
  expect(results).toBeEmptyDOMElement();
  expect(view.getByLabelText("Selected brands")).toHaveTextContent("Unavailable Brand");
  fireEvent.click(view.getByRole("button", { name: "Clear filters" }));
  expect(purchase.navigate).toHaveBeenCalledWith({ search: "ref=partners" }, { replace: true, preventScrollReset: true });
  expect(apiRequest).toHaveBeenCalledTimes(1);
});

test("catalogue polling coalesces a slow request and pauses while hidden", async () => {
  let finishFirst;
  apiRequest.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
    .mockResolvedValue({ products: [] });
  const view = render(<Shop />);
  expect(apiRequest).toHaveBeenCalledTimes(1);

  await act(async () => { vi.advanceTimersByTime(40000); });
  expect(apiRequest).toHaveBeenCalledTimes(1);

  await act(async () => { finishFirst({ products: [] }); });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(apiRequest).toHaveBeenCalledTimes(1);

  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  await act(async () => { vi.advanceTimersByTime(20000); });
  expect(apiRequest).toHaveBeenCalledTimes(2);
  view.unmount();
});

test("returning to the shop shows the cached catalog while stock is refreshed", async () => {
  const lastProduct = { id: "p1", name: "Previously Listed Model", price: 20000, stock: 1 };
  let finish;
  apiRequest.mockImplementation((_path, { onCached }) => {
    onCached({ products: [lastProduct] }, 50_000);
    return new Promise((resolve) => { finish = resolve; });
  });
  const view = render(<Shop />);
  expect(view.getByText(lastProduct.name)).toBeVisible();
  await act(async () => { finish({ products: [] }); });
  expect(view.getByRole("list", { name: "Catalog results" })).toBeEmptyDOMElement();
});

test("web Buy Now routes only the selected product even when the cart already has the last unit", async () => {
  authState.authenticated = true;
  purchase.cart = [{ id: "p1", quantity: 1 }, { id: "p2", quantity: 1 }];
  apiRequest.mockImplementation(async (path) => {
    if (path === "/notifications/me") return { notifications: [] };
    if (path === "/users/addresses?resolveDeliveryBranch=true") return { deliveryBranch: "Cavite" };
    if (path === "/users/addresses") return { addresses: [{ city: "Bacoor", isDefault: true }] };
    if (path === "/products/public?branch=Cavite") return {
      products: [{ id: "p2", name: "Window AC", category: "window", price: 200, stock: 1 }],
    };
    throw new Error(`Unexpected path: ${path}`);
  });
  const view = render(<Shop />);
  await act(async () => {});
  const catalogueRequests = apiRequest.mock.calls.map(([path]) => path).filter((path) => path !== "/notifications/me");
  expect(catalogueRequests).toEqual([
    "/users/addresses?resolveDeliveryBranch=true", "/products/public?branch=Cavite",
  ]);
  expect(resolveConfiguredBranch).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(view.getByRole("button", { name: "Buy Now" })); });
  expect(resolveConfiguredBranch).toHaveBeenCalledWith({ city: "Bacoor", isDefault: true });
  expect(apiRequest).toHaveBeenCalledWith("/products/public?branch=Cavite", { fresh: true });
  expect(purchase.navigate).toHaveBeenCalledWith("/checkout", {
    state: { buyNowItem: expect.objectContaining({ id: "p2", quantity: 1 }) },
  });
  expect(purchase.addToCart).not.toHaveBeenCalled();
});

test("an older anonymous response cannot replace branch-specific stock after sign-in", async () => {
  let finishAnonymous;
  apiRequest.mockImplementation((path) => {
    if (path === "/products/public") return new Promise((resolve) => { finishAnonymous = resolve; });
    if (path === "/users/addresses?resolveDeliveryBranch=true") return Promise.resolve({ addresses: [{ city: "Bacoor", isDefault: true }] });
    if (path === "/products/public?branch=Cavite") return Promise.resolve({ products: [] });
    throw new Error(`Unexpected path: ${path}`);
  });
  const view = render(<Shop />);
  authState.authenticated = true;
  await act(async () => { view.rerender(<Shop />); });
  expect(view.getByText(/Cavite delivery branch/)).toBeInTheDocument();
  await act(async () => { finishAnonymous({ products: [] }); });
  expect(view.getByText(/Cavite delivery branch/)).toBeInTheDocument();
  view.unmount();
});

test("an unmatched saved address retains the coverage error instead of showing unrelated stock", async () => {
  authState.authenticated = true;
  const address = { city: "Outside Service Area", isDefault: true };
  resolveConfiguredBranch.mockRejectedValueOnce(new Error("No coverage"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    apiRequest.mockResolvedValue({ addresses: [address], deliveryBranch: "" });
    render(<Shop />);
    await act(async () => {});
    expect(resolveConfiguredBranch).toHaveBeenCalledWith(address, { display: true, fresh: false });
    expect(apiRequest.mock.calls.some(([path]) => path.startsWith("/products/public"))).toBe(false);
  } finally {
    log.mockRestore();
  }
});

test("returning shop shows cached branch stock before addresses refresh and ignores older branch results", async () => {
  authState.authenticated = true;
  let finishAddress;
  let finishOldStock;
  apiRequest.mockImplementation((path, options) => {
    if (path === "/notifications/me") return Promise.resolve({ notifications: [] });
    if (path === "/users/addresses?resolveDeliveryBranch=true") {
      options.onCached({ deliveryBranch: "Cavite" });
      return new Promise((resolve) => { finishAddress = resolve; });
    }
    if (path === "/products/public?branch=Cavite") {
      options.onCached({ products: [{ id: "old", name: "Cached Cavite Inverter", price: 100, stock: 1 }] });
      return new Promise((resolve) => { finishOldStock = resolve; });
    }
    if (path === "/products/public?branch=Laguna") return Promise.resolve({ products: [{ id: "new", name: "Current Laguna Inverter", price: 100, stock: 1 }] });
    throw new Error(`Unexpected path: ${path}`);
  });
  const view = render(<Shop />);
  expect(view.getByText("Cached Cavite Inverter")).toBeVisible();
  await act(async () => { finishAddress({ deliveryBranch: "Laguna" }); });
  expect(view.getByText("Current Laguna Inverter")).toBeVisible();
  await act(async () => { finishOldStock({ products: [{ id: "old", name: "Late Cavite Inverter", price: 100, stock: 1 }] }); });
  expect(view.queryByText("Late Cavite Inverter")).not.toBeInTheDocument();
  expect(view.getByText("Current Laguna Inverter")).toBeVisible();
});
