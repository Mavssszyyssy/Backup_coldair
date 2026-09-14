import {
  apiFetch,
  API_BASE_FALLBACKS,
  DIRECT_FETCH_TIMEOUT_MS,
  READ_RETRY_DELAY_MS,
} from "../constants/config";
jest.mock("expo-constants", () => ({ expoConfig: {} }));
jest.mock("./backendConnectionState", () => ({ beginBackendConnection: jest.fn(), failBackendConnection: jest.fn(), finishBackendConnection: jest.fn() }));

test("an AI request is not repeated on a fallback server after connection loss", async () => {
  const previousFetch = global.fetch;
  const previousFallbacks = [...API_BASE_FALLBACKS];
  API_BASE_FALLBACKS.push("http://fallback.test/api");
  global.fetch = jest.fn().mockRejectedValue(new TypeError("Connection lost"));
  try {
    await expect(apiFetch("/ai/amp-report", { method: "POST" })).rejects.toThrow("Connection lost");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally { global.fetch = previousFetch; API_BASE_FALLBACKS.splice(0, API_BASE_FALLBACKS.length, ...previousFallbacks); }
});

test("an ordinary read recovers once from a temporary backend response", async () => {
  const previousFetch = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({ status: 503 })
    .mockResolvedValueOnce({ status: 200 });
  try {
    const response = await apiFetch("/orders/me", { method: "GET" });
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  } finally {
    global.fetch = previousFetch;
  }
});

test("a stale direct read is timed out instead of blocking mobile refresh forever", async () => {
  jest.useFakeTimers();
  const previousFetch = global.fetch;
  const previousFallbacks = [...API_BASE_FALLBACKS];
  API_BASE_FALLBACKS.splice(0, API_BASE_FALLBACKS.length);
  global.fetch = jest.fn((_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        reject(error);
      });
    }),
  );
  try {
    const expectation = expect(apiFetch("/orders/me")).rejects.toMatchObject({
      code: "BACKEND_FETCH_TIMEOUT",
    });
    await jest.runAllTimersAsync();
    await expectation;
    expect(global.fetch).toHaveBeenCalledTimes(3);
  } finally {
    global.fetch = previousFetch;
    API_BASE_FALLBACKS.splice(
      0,
      API_BASE_FALLBACKS.length,
      ...previousFallbacks,
    );
    jest.useRealTimers();
  }
});
