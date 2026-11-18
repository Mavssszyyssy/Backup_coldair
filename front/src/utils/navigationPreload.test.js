import { afterEach, expect, test, vi } from "vitest";
import { listenForNavigationIntent, navigationRouteName } from "./navigationPreload";
import { lazyWithReload, preloadLazyRoute } from "./lazyWithReload";

let cleanup;
afterEach(() => { cleanup?.(); document.body.innerHTML = ""; vi.useRealTimers(); });

test.each([
  ["/shop", null, "Shop"], ["/myunit", "customer", "MyUnit"], ["/settings", "customer", "Settings"],
  ["/admin/inventory", "admin", "AdminInventory"], ["/admin/services/orders", "admin", "AdminServices"],
  ["/superadmin/branches", "superadmin", "SuperAdminBranches"], ["/superadmin/reports", "superadmin", "AdminReports"],
  ["/manager/amp", "admin", "ManagerAmpDashboard"], ["/admin/inventory", "customer", undefined],
  ["/superadmin/services", "admin", undefined], ["/settings", null, undefined], ["/unknown", "superadmin", undefined],
])("warms the authorized route %s for %s", (path, role, name) => expect(navigationRouteName(path, role)).toBe(name));

test("navigation intent warms only its local page, supports menu buttons, and cleans up", async () => {
  vi.useFakeTimers();
  const preload = vi.fn().mockResolvedValue({});
  document.body.innerHTML = '<a href="/admin/inventory?tab=serial-qr">Inventory</a><button data-preload-path="/admin/services">Services</button><a href="https://outside.example/shop">Outside</a>';
  cleanup = listenForNavigationIntent({ role: "admin", preload });
  const [inventory, outside] = document.querySelectorAll("a");
  inventory.dispatchEvent(new Event("pointerover", { bubbles: true }));
  expect(preload).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(80);
  expect(preload).toHaveBeenCalledExactlyOnceWith("AdminInventory");
  document.querySelector("button").dispatchEvent(new Event("focusin", { bubbles: true }));
  await vi.advanceTimersByTimeAsync(0);
  expect(preload).toHaveBeenLastCalledWith("AdminServices");
  outside.dispatchEvent(new Event("pointerover", { bubbles: true }));
  await vi.advanceTimersByTimeAsync(100);
  expect(preload).toHaveBeenCalledTimes(2);
  cleanup();
  inventory.dispatchEvent(new Event("focusin", { bubbles: true }));
  await vi.advanceTimersByTimeAsync(100);
  expect(preload).toHaveBeenCalledTimes(2);
});

test("data saver and cancelled hover avoid unnecessary page downloads", async () => {
  vi.useFakeTimers();
  const preload = vi.fn();
  document.body.innerHTML = '<a href="/shop">Shop</a>';
  cleanup = listenForNavigationIntent({ connection: { saveData: true }, preload });
  document.querySelector("a").dispatchEvent(new Event("focusin", { bubbles: true }));
  await vi.advanceTimersByTimeAsync(100);
  expect(preload).not.toHaveBeenCalled();
  cleanup();
  cleanup = listenForNavigationIntent({ preload });
  document.querySelector("a").dispatchEvent(new Event("pointerover", { bubbles: true }));
  document.querySelector("a").dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body }));
  await vi.advanceTimersByTimeAsync(100);
  expect(preload).not.toHaveBeenCalled();
});

test("code warming shares its pending import and retries a failed download", async () => {
  const module = { default: () => null };
  const importer = vi.fn().mockRejectedValueOnce(new Error("temporary chunk error")).mockResolvedValue(module);
  lazyWithReload(importer, "FixtureWarmRoute");
  const first = preloadLazyRoute("FixtureWarmRoute");
  expect(preloadLazyRoute("FixtureWarmRoute")).toBe(first);
  await expect(first).rejects.toThrow("temporary chunk error");
  await expect(preloadLazyRoute("FixtureWarmRoute")).resolves.toBe(module);
  await expect(preloadLazyRoute("FixtureWarmRoute")).resolves.toBe(module);
  expect(importer).toHaveBeenCalledTimes(2);
});
