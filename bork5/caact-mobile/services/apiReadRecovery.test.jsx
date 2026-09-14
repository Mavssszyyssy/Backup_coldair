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

test("a database-backed mobile read remains active beyond the old ten-second cutoff", async () => {
  jest.useFakeTimers();
  let requestSignal;
  apiFetch.mockImplementation((_path, options) => {
    requestSignal = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  });

  try {
    const resultPromise = checkBackendConnection();
    await jest.advanceTimersByTimeAsync(10000);
    expect(requestSignal.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(READ_REQUEST_TIMEOUT_MS - 10000);
    await expect(resultPromise).resolves.toMatchObject({
      connected: false,
      status: 0,
    });
    expect(requestSignal.aborted).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});
