import { afterEach, expect, test, vi } from "vitest";
import { apiRequest } from "./api";

vi.mock("../utils/authSession", () => ({
  clearAuthSession: vi.fn(),
  getAuthSessionItem: () => null,
  getSessionActiveBranch: () => null,
}));

afterEach(() => vi.unstubAllGlobals());

test("bodyless public GET avoids a JSON preflight header", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) });
  vi.stubGlobal("fetch", fetchMock);

  await apiRequest("/products/public");

  const [, options] = fetchMock.mock.calls[0];
  expect(options.method).toBeUndefined();
  expect(options.headers).not.toHaveProperty("Content-Type");
  expect(options.credentials).toBe("include");
});

test("JSON write requests keep their content type", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);

  await apiRequest("/auth/session/cart", {
    method: "POST",
    body: JSON.stringify({ cart: [] }),
  });

  const [, options] = fetchMock.mock.calls[0];
  expect(options.headers["Content-Type"]).toBe("application/json");
  expect(options.body).toBe('{"cart":[]}');
});
