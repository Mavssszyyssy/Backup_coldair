import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import CheckoutScreen from "../app/customer/checkout";

const mockProduct = { id: "p1", name: "AC", sku: "test-sku", price: 100, stock: 5, inStock: true, quantity: 1 };
const mockCart = { cart: [mockProduct], clearCart: jest.fn(), replaceCart: jest.fn() };
const mockUser = { id: "customer-1", addresses: [{
  id: "home", isDefault: true, name: "Test Customer", street: "Test Street", barangay: "Molino I",
  city: "Bacoor", province: "Cavite", region: "CALABARZON", phone: "09123456789", postalCode: "4102",
}] };
const mockReplace = jest.fn();
const mockCreateOrder = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({}),
  usePathname: () => "/customer/checkout",
}));
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../context/CartContext", () => ({ useCart: () => mockCart }));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: mockUser, token: "test-token" }) }));
jest.mock("../hooks/useInterfaceLanguage", () => ({ useInterfaceLanguage: () => ({ t: (value) => value }) }));
jest.mock("./api", () => ({ createOrder: (...args) => mockCreateOrder(...args), me: async () => ({ success: true, user: mockUser }) }));
jest.mock("./ecommerceService", () => ({
  fetchShopProducts: async () => [mockProduct],
  resolveConfiguredInventoryBranch: async () => "Cavite",
  formatPeso: (amount) => `PHP ${amount}`,
}));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

async function submitCheckout() {
  await render(<CheckoutScreen />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled());
  await fireEvent.press(screen.getByRole("button", { name: "Continue to payment" }));
}

test("switches to the saved order before opening PayMongo in the browser", async () => {
  const url = "https://checkout.example/test";
  mockCreateOrder.mockResolvedValue({ success: true, order: { id: "order-1" }, payment: { checkoutUrl: url } });
  jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await submitCheckout();
  await waitFor(() => expect(open).toHaveBeenCalledWith(url));
  expect(mockReplace).toHaveBeenCalledWith("/customer/order-confirmation/order-1?payment=returned");
  expect(mockReplace.mock.invocationCallOrder[0]).toBeLessThan(open.mock.invocationCallOrder[0]);
  expect(mockCart.clearCart).toHaveBeenCalledTimes(1);
  expect(mockCreateOrder).toHaveBeenCalledTimes(1);
});

test("an unavailable payment link still leaves the user on the existing order", async () => {
  mockCreateOrder.mockResolvedValue({ success: true, order: { id: "order-1" } });
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await submitCheckout();
  await waitFor(() => expect(alert).toHaveBeenCalledWith("Payment connection failed", expect.stringContaining("Your order was saved")));
  expect(mockReplace).toHaveBeenCalledWith("/customer/order-confirmation/order-1?payment=returned");
  expect(open).not.toHaveBeenCalled();
});
