import { describe, expect, it, vi } from "vitest";
import { isChunkLoadError, loadLazyModule } from "./lazyWithReload";

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => values.get(key) || null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  };
};

describe("lazy route recovery", () => {
  it("recognizes browser errors produced by obsolete deployment chunks", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error('Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".'))).toBe(true);
    expect(isChunkLoadError(new Error("Inventory data is invalid"))).toBe(false);
  });

  it("reloads once when a stale route chunk cannot be imported", async () => {
    const storage = createStorage();
    const reload = vi.fn();

    void loadLazyModule(
      () => Promise.reject(new TypeError("Failed to fetch dynamically imported module")),
      "SuperAdminInventory",
      { storage, location: { pathname: "/superadmin/inventory", reload } },
    );
    await Promise.resolve();

    expect(storage.setItem).toHaveBeenCalledWith(
      "aeropulse:lazy-route-reload:SuperAdminInventory:/superadmin/inventory",
      "attempted",
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not enter a reload loop when the refreshed import still fails", async () => {
    const key = "aeropulse:lazy-route-reload:SuperAdminInventory:/superadmin/inventory";
    const storage = createStorage({ [key]: "attempted" });
    const reload = vi.fn();
    const error = new TypeError("Failed to fetch dynamically imported module");

    await expect(loadLazyModule(
      () => Promise.reject(error),
      "SuperAdminInventory",
      { storage, location: { pathname: "/superadmin/inventory", reload } },
    )).rejects.toBe(error);
    expect(reload).not.toHaveBeenCalled();
  });

  it("clears the retry marker after a successful import", async () => {
    const storage = createStorage();
    const module = { default: () => null };

    await expect(loadLazyModule(
      () => Promise.resolve(module),
      "SuperAdminInventory",
      { storage, location: { pathname: "/superadmin/inventory", reload: vi.fn() } },
    )).resolves.toBe(module);
    expect(storage.removeItem).toHaveBeenCalledWith(
      "aeropulse:lazy-route-reload:SuperAdminInventory:/superadmin/inventory",
    );
  });
});
