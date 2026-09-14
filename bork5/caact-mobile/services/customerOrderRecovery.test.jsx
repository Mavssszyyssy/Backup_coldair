import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../constants/config";
import { getStoredToken } from "./api";
import { getOrderById } from "./orderStorage";

jest.mock("../constants/config", () => ({ apiFetch: jest.fn() }));
jest.mock("./api", () => ({
  getStoredToken: jest.fn(),
  retryPaymongoCheckout: jest.fn(),
  verifyPaymongoCheckout: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

test("customer order details use the dedicated order endpoint", async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
  AsyncStorage.setItem.mockResolvedValue();
  getStoredToken.mockResolvedValue("customer-token");
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      order: {
        id: "order-123",
        orderCode: "ORD-123",
        customer: "customer-1",
        customerEmail: "customer@example.com",
        items: [],
        totalAmount: 100,
      },
    }),
  });

  await expect(getOrderById("order-123")).resolves.toMatchObject({
    id: "order-123",
    orderCode: "ORD-123",
  });
  expect(apiFetch).toHaveBeenCalledWith(
    "/orders/me/order-123",
    { headers: { Authorization: "Bearer customer-token" } },
  );
  expect(apiFetch).not.toHaveBeenCalledWith(
    expect.stringContaining("/orders/me?limit="),
    expect.anything(),
  );
});
