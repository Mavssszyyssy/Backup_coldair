import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.sessionStorage.clear(); });
it("does not replay an uncertain AI request against another host", async () => {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", "https://primary.test/api");
  vi.stubEnv("VITE_API_FALLBACK_URL", "https://fallback.test/api");
  const fetch = vi.fn().mockRejectedValue(new TypeError("Connection lost"));
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.sessionStorage.setItem("accessToken", "test-token");
  const { apiRequest } = await import("./api");
  await expect(apiRequest("/ai/amp-report", { method: "POST", body: "{}" })).rejects.toThrow("Unable to connect");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe("https://primary.test/api/ai/amp-report");
});
