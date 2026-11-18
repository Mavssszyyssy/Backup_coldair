import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { apiRequest } from "./api";
import { loadPageRequests } from "./loadPageRequests";
import { primeGuestCatalogue } from "../domain/primeGuestCatalogue";

const auth = vi.hoisted(() => ({ token: null, branch: "" }));
vi.mock("../utils/authSession", () => ({
  clearAuthSession: vi.fn(),
  getAuthSessionItem: () => auth.token,
  getSessionActiveBranch: () => auth.branch,
}));

beforeEach(() => {
  auth.token = null;
  auth.branch = "";
  window.dispatchEvent(new Event("auth:session-ended"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const reply = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });

test("shop reuses a display read within the same branch and TTL while stock validation reads fresh", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(50_000);
  let stock = 8;
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ products: [{ stock }] }) }));
  vi.stubGlobal("fetch", fetchMock);
  const display = { display: true, silentConnection: true };
  const cavite = "/products/public?branch=Cavite";
  const first = await apiRequest(cavite, display);
  stock = 0;
  expect(await apiRequest(cavite, display)).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("display");

  expect((await apiRequest("/products/public?branch=Laguna", display)).products[0].stock).toBe(0);
  expect((await apiRequest(cavite)).products[0].stock).toBe(0);
  expect(fetchMock).toHaveBeenCalledTimes(3);

  now.mockReturnValue(65_000);
  await apiRequest("/products/public?branch=Laguna", display);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

test.each([
  "/dashboard/me?branch=Bulacan", "/amp/manager/pipeline?days=30", "/reports/sales",
  "/orders/me?status=completed", "/users/addresses", "/products?branch=Bulacan",
  "/tasks?scheduled_date=2026-11-14", "/contact-messages/me", "/notifications/me",
  "/warranties/claims", "/reorders/mine", "/system-settings/email-domains",
])("reuses matching page data across reads for %s", async (path) => {
  auth.token = "test-session";
  const fetchMock = vi.fn().mockResolvedValue(reply({ rows: [{ count: 1 }] }));
  vi.stubGlobal("fetch", fetchMock);
  const result = await apiRequest(path);
  result.rows[0].count = 5;
  expect(await apiRequest(path)).toEqual({ rows: [{ count: 1 }] });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
});

test("revisits can render a recent dashboard snapshot while a network refresh is pending", async () => {
  auth.token = "dashboard-session";
  const now = vi.spyOn(Date, "now").mockReturnValue(50_000);
  let finish;
  const fetchMock = vi.fn().mockResolvedValueOnce(reply({ count: 1 }))
    .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", fetchMock);
  const path = "/dashboard/me?branch=Cavite";
  await apiRequest(path);
  now.mockReturnValue(80_000);
  const onCached = vi.fn();
  const connectionUpdate = vi.fn();
  window.addEventListener("aeropulse:connection", connectionUpdate, { once: true });
  const revalidate = apiRequest(path, { onCached });
  expect(onCached).toHaveBeenCalledWith({ count: 1 }, 50_000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  finish(reply({ count: 2 }));
  expect(await revalidate).toEqual({ count: 2 });
  window.removeEventListener("aeropulse:connection", connectionUpdate);
  expect(connectionUpdate).not.toHaveBeenCalled();
});

test("a page with several lists can render a matching snapshot before its slowest read finishes", async () => {
  auth.token = "dispatch-session";
  const now = vi.spyOn(Date, "now").mockReturnValue(50_000);
  const fetchMock = vi.fn((url) => Promise.resolve(reply({ url })));
  vi.stubGlobal("fetch", fetchMock);
  const orders = "/orders";
  const tasks = "/tasks?limit=75";
  await apiRequest(orders);
  const snapshot = vi.fn();
  await loadPageRequests([orders, tasks], { onCached: snapshot });
  expect(snapshot).not.toHaveBeenCalled();

  now.mockReturnValue(63_000);
  let finish;
  fetchMock.mockImplementationOnce(() => Promise.resolve(reply({ orders: ["new"] })))
    .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const refresh = loadPageRequests([orders, tasks], { onCached: snapshot });
  expect(snapshot).toHaveBeenCalledWith([
    { url: expect.stringContaining(orders) },
    { url: expect.stringContaining(tasks) },
  ], 50_000);
  finish(reply({ tasks: ["new"] }));
  expect(await refresh).toEqual([{ orders: ["new"] }, { tasks: ["new"] }]);
});

test("shop display addresses are reusable without sharing data with checkout validation", async () => {
  auth.token = "shop-session";
  const now = vi.spyOn(Date, "now").mockReturnValue(50_000);
  const fetchMock = vi.fn().mockResolvedValueOnce(reply({ addresses: ["original"] }))
    .mockResolvedValue(reply({ addresses: ["current"] }));
  vi.stubGlobal("fetch", fetchMock);
  const path = "/users/addresses";
  await apiRequest(path, { display: true });
  now.mockReturnValue(70_000);
  expect(await apiRequest(path, { display: true })).toEqual({ addresses: ["original"] });
  expect(await apiRequest(path, { fresh: true })).toEqual({ addresses: ["current"] });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("a manual refresh replaces older reads, and late results cannot refill the cache", async () => {
  auth.token = "refresh-session";
  let finish;
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
    .mockResolvedValueOnce(reply({ count: 2 }));
  vi.stubGlobal("fetch", fetchMock);
  const path = "/orders/me";
  const oldRead = apiRequest(path);
  expect(await apiRequest(path, { fresh: true })).toEqual({ count: 2 });
  finish(reply({ count: 1 }));
  await oldRead;
  expect(await apiRequest(path)).toEqual({ count: 2 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("cache boundaries include query, active branch, account, and sign-out", async () => {
  auth.token = "first-account";
  auth.branch = "Bulacan";
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(async () => reply({ count: ++calls })));
  const read = () => apiRequest("/orders?limit=10");
  expect(await read()).toEqual({ count: 1 });
  expect(await apiRequest("/orders?limit=20")).toEqual({ count: 2 });
  expect(await read()).toEqual({ count: 1 });
  auth.branch = "Laguna";
  expect(await read()).toEqual({ count: 3 });
  auth.token = "second-account";
  expect(await read()).toEqual({ count: 4 });
  window.dispatchEvent(new Event("auth:session-ended"));
  expect(await read()).toEqual({ count: 5 });
});

test("a stock update invalidates linked inventory, orders, and summaries even with reads in flight", async () => {
  auth.token = "operations-session";
  let stock = 5;
  let finish;
  vi.stubGlobal("fetch", vi.fn(async (url, options) => {
    if (options.method === "PATCH") {
      stock = 4;
      return reply({ success: true });
    }
    if (url.endsWith("/orders?limit=75") && stock === 5) {
      return new Promise((resolve) => { finish = resolve; });
    }
    return reply({ stock });
  }));
  await apiRequest("/products");
  await apiRequest("/dashboard/me");
  const oldOrders = apiRequest("/orders?limit=75");
  await apiRequest("/products/product-1/stock", { method: "PATCH" });
  finish(reply({ stock: 5 }));
  await oldOrders;
  for (const path of ["/products", "/dashboard/me", "/orders?limit=75"]) {
    expect(await apiRequest(path)).toEqual({ stock: 4 });
  }
});

test("notification changes refresh alerts without evicting other web pages", async () => {
  auth.token = "alerts-session";
  const fetchMock = vi.fn(async () => reply({ rows: [] }));
  vi.stubGlobal("fetch", fetchMock);
  await apiRequest("/dashboard/me");
  await apiRequest("/notifications/me");
  await apiRequest("/notifications/notice/read", { method: "PATCH" });
  await apiRequest("/notifications/me");
  await apiRequest("/dashboard/me");
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

test("auth and checkout validation reads remain live and errors are not cached", async () => {
  auth.token = "checkout-session";
  const fetchMock = vi.fn(async () => reply({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  for (const path of ["/auth/me", "/auth/session", "/branches/resolve?city=Malolos", "/products/public?branch=Bulacan"]) {
    await apiRequest(path);
    await apiRequest(path);
  }
  expect(fetchMock).toHaveBeenCalledTimes(8);
  fetchMock.mockResolvedValueOnce(reply({ message: "Temporarily unavailable" }, 500));
  await expect(apiRequest("/orders")).rejects.toMatchObject({ status: 500 });
  await expect(apiRequest("/orders")).resolves.toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(10);
});

test("an authorization rejection drops cached private records", async () => {
  auth.token = "permission-session";
  const path = "/dashboard/me";
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(reply({ count: 1 }))
    .mockResolvedValueOnce(reply({ message: "Forbidden" }, 403))
    .mockResolvedValueOnce(reply({ count: 3 }));
  vi.stubGlobal("fetch", fetchMock);
  await apiRequest(path);
  await expect(apiRequest("/orders")).rejects.toMatchObject({ status: 403 });
  expect(await apiRequest(path)).toEqual({ count: 3 });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test("public catalogue GET avoids preflight headers even with a signed-in session", async () => {
  auth.token = "test-session";
  auth.branch = "Cavite";
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) });
  vi.stubGlobal("fetch", fetchMock);

  await apiRequest("/products/public");

  const [, options] = fetchMock.mock.calls[0];
  expect(options.method).toBeUndefined();
  expect(options.headers).not.toHaveProperty("Content-Type");
  expect(options.headers).not.toHaveProperty("Authorization");
  expect(options.headers).not.toHaveProperty("X-Branch");
  expect(options.credentials).toBe("omit");
  expect(options.cache).toBe("no-store");
});

test("a guest landing request starts early and is shared by the shop", async () => {
  let finish;
  const fetchMock = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", fetchMock);
  primeGuestCatalogue("/login");
  expect(fetchMock).not.toHaveBeenCalled();

  primeGuestCatalogue("/");
  const shopResult = apiRequest("/products/public", { display: true, silentConnection: true });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  finish(reply({ products: [{ id: "ac-1" }] }));
  await expect(shopResult).resolves.toEqual({ products: [{ id: "ac-1" }] });

  auth.token = "test-session";
  primeGuestCatalogue("/shop");
  expect(fetchMock).toHaveBeenCalledTimes(1);
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

test("equivalent filters share their cached response and in-flight request without changing the URL sent", async () => {
  auth.token = "query-session";
  let finish;
  const fetchMock = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
  vi.stubGlobal("fetch", fetchMock);
  const first = apiRequest("/tasks?limit=75&status=pending");
  const second = apiRequest("/tasks?status=pending&limit=75");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/tasks\?limit=75&status=pending$/);
  finish(reply({ tasks: ["task-1"] }));
  expect(await second).toEqual(await first);
  expect(await apiRequest("/tasks?status=pending&limit=75")).toEqual({ tasks: ["task-1"] });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("returning after five minutes paints a snapshot immediately and still fetches current data", async () => {
  auth.token = "return-visit";
  const now = vi.spyOn(Date, "now").mockReturnValue(50_000);
  let finish;
  const fetchMock = vi.fn().mockResolvedValueOnce(reply({ count: 1 }))
    .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
    .mockResolvedValue(reply({ count: 3 }));
  vi.stubGlobal("fetch", fetchMock);
  await apiRequest("/dashboard/me");
  now.mockReturnValue(350_000);
  const onCached = vi.fn();
  const refresh = apiRequest("/dashboard/me", { onCached });
  expect(onCached).toHaveBeenCalledWith({ count: 1 }, 50_000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  finish(reply({ count: 2 }));
  expect(await refresh).toEqual({ count: 2 });
  now.mockReturnValue(950_000);
  onCached.mockClear();
  expect(await apiRequest("/dashboard/me", { onCached })).toEqual({ count: 3 });
  expect(onCached).not.toHaveBeenCalled();
});

test("cache normalization retains embedded question marks and repeated filter order", async () => {
  auth.token = "search-session";
  const fetchMock = vi.fn(async (url) => reply({ url }));
  vi.stubGlobal("fetch", fetchMock);
  const first = await apiRequest("/orders?search=question?one&status=pending");
  expect(await apiRequest("/orders?status=pending&search=question%3Fone")).toEqual(first);
  expect(await apiRequest("/orders?search=question?two&status=pending")).not.toEqual(first);
  await apiRequest("/orders?filter=one&filter=two");
  await apiRequest("/orders?filter=two&filter=one");
  expect(fetchMock).toHaveBeenCalledTimes(4);
});
