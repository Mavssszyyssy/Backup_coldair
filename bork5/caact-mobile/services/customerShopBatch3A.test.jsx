import React from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { fireEvent, render, screen } from "@testing-library/react-native";
import CustomerShopScreen, { CartModal } from "../app/customer/shop";
import { apiFetch } from "../constants/config";
import { me } from "./api";
import { fetchShopProducts, paginateProducts, partitionProductsByAvailability } from "./ecommerceService";

const mockPush = jest.fn();
const mockRemove = jest.fn();
let mockCurrent = null;
const mockCart = Array.from({ length: 12 }, (_, index) => ({
  id: `item-${index + 1}`, name: `AC ${index + 1}`, brand: "AeroPulse", model: `M-${index + 1}`,
  price: 1000, quantity: 1, stock: 12,
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => "/customer/shop", useFocusEffect: (callback) => require("react").useEffect(callback, [callback]) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ language: "English", t: value => value }) }));
jest.mock("../context/CartContext", () => ({ useCart: () => ({ cart: mockCart, cartTotal: 12000, updateQuantity: jest.fn(), removeFromCart: mockRemove }) }));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockCurrent, token: "fixture-token" }) }));
jest.mock("./api", () => ({ me: jest.fn() }));
jest.mock("./liveRefresh", () => ({ startLiveRefresh: jest.fn((refresh) => { refresh({ background: false }); return jest.fn(); }) }));
jest.mock("../constants/config", () => ({ apiFetch: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); mockCurrent = null; });

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

test("cart keeps its item list scrollable while checkout actions remain outside it", async () => {
  await render(<CartModal visible onClose={jest.fn()} />);
  const list = screen.getByTestId("cart-items-scroll");
  expect(list.props.nestedScrollEnabled).toBe(true);
  expect(screen.getByText("AC 12")).toBeTruthy();
  expect(screen.getByText("Subtotal")).toBeTruthy();
  await fireEvent.press(screen.getByText("Checkout"));
  expect(mockPush).toHaveBeenCalledWith("/customer/checkout");
});

test("shop page controls expose later products, including out-of-stock units", async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ products: Array.from({ length: 12 }, (_, index) => ({ id: `unit-${index + 1}`, name: `Catalog AC ${index + 1}`, brand: "AeroPulse", stock: index < 9 ? 1 : 0, price: 23000 })) }) });
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><CustomerShopScreen /></SafeAreaProvider>);
  expect(await screen.findByText("Catalog AC 1")).toBeTruthy();
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
