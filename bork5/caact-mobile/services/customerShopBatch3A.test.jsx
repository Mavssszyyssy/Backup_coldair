import React from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerShopScreen, { CartModal } from "../app/customer/shop";
import CheckoutScreen from "../app/customer/checkout";
import { apiFetch } from "../constants/config";
import { createOrder, me } from "./api";
import { fetchShopProducts, getShopDeliveryAddress, paginateProducts, partitionProductsByAvailability } from "./ecommerceService";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRemove = jest.fn();
const mockAdd = jest.fn();
const mockClearCart = jest.fn();
const mockReplaceCart = jest.fn();
const mockUpdateQuantity = jest.fn();
let mockParams = {};
let mockCurrent = null;
const mockInitialCart = Array.from({ length: 12 }, (_, index) => ({
  id: `item-${index + 1}`, name: `AC ${index + 1}`, brand: "AeroPulse", model: `M-${index + 1}`,
  price: 1000, quantity: 1, stock: 12,
}));
let mockCart = mockInitialCart;
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), useLocalSearchParams: () => mockParams, usePathname: () => "/customer/shop", useFocusEffect: (callback) => require("react").useEffect(callback, [callback]) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ language: "English", t: value => value }) }));
jest.mock("../context/CartContext", () => ({ useCart: () => ({ cart: mockCart, cartTotal: mockCart.reduce((total, item) => total + item.price * item.quantity, 0), updateQuantity: mockUpdateQuantity, removeFromCart: mockRemove, addToCart: mockAdd, clearCart: mockClearCart, replaceCart: mockReplaceCart }) }));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockCurrent, token: "fixture-token" }) }));
jest.mock("./api", () => ({ createOrder: jest.fn(), me: jest.fn() }));
jest.mock("./liveRefresh", () => ({ startLiveRefresh: jest.fn((refresh) => { refresh({ background: false }); return jest.fn(); }) }));
jest.mock("../constants/config", () => ({ apiFetch: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

beforeEach(() => { jest.clearAllMocks(); mockCurrent = null; mockParams = {}; mockCart = mockInitialCart; });

test("product stock and details retain the requested delivery branch scope", async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ products: [{
    id: "unit-1", name: "AeroPulse Split", brand: "AeroPulse", stock: 0, totalStock: 7,
    stockScope: "branch", inventoryBranch: "Bulacan", description: "Inverter unit", price: 23000,
  }] }) });
  const products = await fetchShopProducts("Bulacan");
  expect(apiFetch).toHaveBeenCalledWith("/products/public?branch=Bulacan");
  expect(products[0]).toMatchObject({ stock: 0, totalStock: 7, inStock: false, stockScope: "branch", inventoryBranch: "Bulacan", description: "Inverter unit" });
  expect(products[0].stockLabel).toContain("Bulacan");
});

test("pagination covers available and out-of-stock products without dropping any", () => {
  const products = [...Array.from({ length: 9 }, (_, index) => ({ id: `ready-${index}`, inStock: true })),
    ...Array.from({ length: 3 }, (_, index) => ({ id: `sold-${index}`, inStock: false }))];
  const groups = partitionProductsByAvailability(products);
  const ordered = [...groups.available, ...groups.unavailable];
  const first = paginateProducts(ordered, 1, 8);
  const second = paginateProducts(ordered, 2, 8);
  expect(first.totalPages).toBe(2);
  expect([...first.items, ...second.items].map((item) => item.id)).toEqual(ordered.map((item) => item.id));
  expect(second.items.filter((item) => !item.inStock)).toHaveLength(3);
  expect(paginateProducts(ordered, 99, 8).page).toBe(2);
});

test("catalogue display reads coalesce and expire, and purchase checks fetch fresh stock", async () => {
  const clock = jest.spyOn(Date, "now").mockReturnValue(50_000);
  let stock = 8;
  apiFetch.mockImplementation(async () => ({ ok: true, json: async () => ({
    products: [{ id: "cache-product", name: "Cache AC", stock }],
  }) }));
  const display = { reuseRecent: true };
  try {
    await Promise.all([fetchShopProducts("Cache Branch", display), fetchShopProducts("Cache Branch", display)]);
    stock = 0;
    expect((await fetchShopProducts("Cache Branch", display))[0].stock).toBe(8);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect((await fetchShopProducts("Other Branch", display))[0].stock).toBe(0);
    expect((await fetchShopProducts("Cache Branch"))[0].stock).toBe(0);
    clock.mockReturnValue(65_000);
    await fetchShopProducts("Other Branch", display);
    expect(apiFetch).toHaveBeenCalledTimes(4);
  } finally {
    clock.mockRestore();
  }
});

test("shop delivery address uses saved delivery addresses and never falls back to billing address", () => {
  expect(getShopDeliveryAddress({ billingAddress: { city: "Malolos" } })).toBeNull();
  const user = { billingAddress: { city: "Malolos" }, addresses: [
    { id: "saved-1", city: "Bocaue" },
    { id: "saved-2", city: "Malolos", isDefault: true },
  ] };
  expect(getShopDeliveryAddress(user).id).toBe("saved-2");
  expect(getShopDeliveryAddress(user, "saved-1").city).toBe("Bocaue");
});

test("cart keeps its item list scrollable while checkout actions remain outside it", async () => {
  await renderCustomerScreen(<CartModal visible onClose={jest.fn()} />);
  const list = screen.getByTestId("cart-items-scroll");
  expect(list.props.nestedScrollEnabled).toBe(true);
  expect(screen.getByText("AC 12")).toBeTruthy();
  expect(screen.getByText("Subtotal")).toBeTruthy();
  await fireEvent.press(screen.getByText("Checkout"));
  expect(mockPush).toHaveBeenCalledWith("/customer/checkout");
});

test("mobile cart photo opens the selected item's details and shares its quantity and total", async () => {
  const onClose = jest.fn();
  mockCart = [mockInitialCart[0], { ...mockInitialCart[1], price: 1300.5, stock: 3, quantity: 2, imageUrl: "https://example.test/ac.jpg" }];
  const page = () => customerScreenWithInsets(<CartModal visible onClose={onClose} />, 320);
  const view = await render(page());
  await fireEvent.press(screen.getByRole("button", { name: "View details: AC 2" }));
  expect(screen.getByRole("header", { name: "Cart item details" })).toBeTruthy();
  expect(screen.queryByText("AC 1")).toBeNull();
  expect(screen.getByText("₱1,300.50")).toBeTruthy();
  expect(screen.getByText("₱2,601.00")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Increase quantity" }));
  expect(mockUpdateQuantity).toHaveBeenCalledWith("item-2", 3);
  mockCart = [mockCart[0], { ...mockCart[1], quantity: 3 }];
  await view.rerender(page());
  expect(screen.getByText("₱3,901.50")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Increase quantity" }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Back to cart" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByText("AC 1")).toBeTruthy();
  expect(screen.getByText("₱4,901.50")).toBeTruthy();
});

test("shop page controls expose later products, including out-of-stock units", async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ products: Array.from({ length: 12 }, (_, index) => ({ id: `unit-${index + 1}`, name: `Catalog AC ${index + 1}`, brand: "AeroPulse", stock: index < 9 ? 1 : 0, price: index === 0 ? 23000.5 : 23000 })) }) });
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><CustomerShopScreen /></SafeAreaProvider>);
  expect(await screen.findByText("Catalog AC 1")).toBeTruthy();
  expect(screen.getByText("₱23,000.50")).toBeTruthy();
  expect(screen.getAllByText("₱23,000.00").length).toBeGreaterThan(0);
  expect(screen.queryByText("Catalog AC 12")).toBeNull();
  await fireEvent.press(screen.getByText("Next"));
  expect(await screen.findByText("Catalog AC 12")).toBeTruthy();
  expect(screen.getByText("Page 2 of 2")).toBeTruthy();
});

test("repeated stale-stock taps show one stock error", async () => {
  mockCurrent = { id: "customer-1", addresses: [{ id: "address-1", isDefault: true, city: "Malolos", province: "Bulacan", region: "Central Luzon", street: "Sample Street" }] };
  me.mockResolvedValue({ success: true, user: mockCurrent });
  let productReads = 0;
  apiFetch.mockImplementation(async (url) => {
    if (url.startsWith("/branches/resolve")) return { ok: true, json: async () => ({ serviceable: true, branch: "Bulacan" }) };
    productReads += 1;
    return { ok: true, json: async () => ({ products: [{ id: "unit-1", name: "AeroPulse Split", brand: "AeroPulse", stock: productReads === 1 ? 2 : 0, stockScope: "branch", inventoryBranch: "Bulacan", price: 23000 }] }) };
  });
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  try {
    await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><CustomerShopScreen /></SafeAreaProvider>);
    const add = await screen.findByText("Add");
    await fireEvent.press(add);
    await fireEvent.press(add);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith("Cannot add to cart", expect.stringContaining("Bulacan"));
  } finally {
    alert.mockRestore();
  }
});

const buyNowAddress = {
  id: "buy-now-address", isDefault: true, name: "Test Customer", phone: "09123456789",
  street: "Sample Street", barangay: "Molino I", city: "Bacoor", province: "Cavite", region: "CALABARZON",
  postalCode: "4102",
};
const buyNowProduct = { id: "item-2", name: "Buy Now AC", brand: "AeroPulse", stock: 3, price: 1500 };
const customerScreenWithInsets = (page, width = 390) => (
  <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
    {page}
  </SafeAreaProvider>
);
const renderCustomerScreen = (page) => render(customerScreenWithInsets(page));

function mockBuyNowCatalogue() {
  mockCurrent = { id: "customer-1", addresses: [buyNowAddress] };
  me.mockResolvedValue({ success: true, user: mockCurrent });
  apiFetch.mockImplementation(async (url) => ({
    ok: true,
    json: async () => url.startsWith("/branches/resolve")
      ? { serviceable: true, branch: "Cavite" }
      : { products: [buyNowProduct] },
  }));
}

test("Buy Now from the mobile catalogue opens a separate checkout for the selected product", async () => {
  mockBuyNowCatalogue();
  await renderCustomerScreen(<CustomerShopScreen />);
  await fireEvent.press(await screen.findByText("Buy Now"));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
    pathname: "/customer/checkout",
    params: expect.objectContaining({ buyNowProductId: "item-2" }),
  }));
  expect(mockAdd).not.toHaveBeenCalled();
});

test("mobile Buy Now submits only the selected product even when it is already in the cart", async () => {
  mockBuyNowCatalogue();
  mockParams = { addressId: buyNowAddress.id, buyNowProductId: "item-2" };
  createOrder.mockResolvedValue({ success: true, order: { id: "buy-now-order" } });
  await renderCustomerScreen(<CheckoutScreen />);
  await fireEvent.press(await screen.findByRole("button", { name: "View order details" }));
  expect(screen.getByText("Buy Now AC")).toBeTruthy();
  expect(screen.queryByText("AC 1")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Increase quantity" }));
  await fireEvent.press(screen.getByText("Cash on delivery"));
  await fireEvent.press(screen.getByRole("button", { name: "Place order" }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/customer/order-confirmation/buy-now-order"));
  expect(createOrder).toHaveBeenCalledWith("fixture-token", expect.objectContaining({
    addressId: buyNowAddress.id,
    items: [expect.objectContaining({ productId: "item-2", quantity: 2 })],
    subtotal: 3000,
  }));
  expect(mockClearCart).not.toHaveBeenCalled();
  expect(mockReplaceCart).not.toHaveBeenCalled();
  expect(mockUpdateQuantity).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});
