import { apiFetch } from "../constants/config";
import {
  checkBackendConnection,
  READ_REQUEST_TIMEOUT_MS,
} from "./api";

jest.mock("../constants/config", () => ({
  API_BASE: "https://api.coldair-act.online/api",
  apiFetch: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

test("the Retry action checks a database route with the full read-attempt timeout", async () => {
  const timeout = new Error("Timed out");
  timeout.name = "TimeoutError";
  timeout.code = "BACKEND_FETCH_TIMEOUT";
  apiFetch.mockRejectedValue(timeout);

  await expect(checkBackendConnection()).resolves.toMatchObject({
    connected: false,
    status: 0,
  });
  expect(apiFetch).toHaveBeenCalledWith(
    "/products/public",
    expect.objectContaining({
      method: "GET",
      timeoutMs: READ_REQUEST_TIMEOUT_MS,
    }),
  );
});
