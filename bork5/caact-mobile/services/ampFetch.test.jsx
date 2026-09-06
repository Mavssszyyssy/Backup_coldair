import { apiFetch, API_BASE_FALLBACKS } from "../constants/config";
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
