import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (...segments) => fs.readFileSync(
  path.resolve(process.cwd(), "src", "components", ...segments),
  "utf8",
);

describe("Admin and SuperAdmin theme isolation", () => {
  it("keeps role colors scoped instead of changing global CSS variables", () => {
    const adminShared = source("ADMIN", "adminShared.css");
    const adminShell = source("ADMIN", "Common", "styles.css");
    const adminDashboard = source("ADMIN", "Dashboard", "styles.css");
    const superShared = source("SUPERADMIN", "superAdminShared.css");

    expect(adminShared).not.toMatch(/^:root\s*\{/m);
    expect(adminShell).not.toMatch(/^:root\s*\{/m);
    expect(adminDashboard).not.toMatch(/^:root\s*\{/m);
    expect(superShared).not.toMatch(/^:root\s*\{/m);
    expect(adminShared).toContain("--role-primary: #1e88e5");
    expect(superShared).toContain("--role-primary: #4f46e5");
  });

  it("protects inventory utility buttons from the generic card-button style", () => {
    const inventory = source("ADMIN", "Inventory", "styles.css");

    expect(inventory).toContain(".admin-card .inventory-serial-preview-close");
    expect(inventory).toContain(".admin-card .inventory-stock-quantity");
    expect(inventory).toContain(".admin-card .inventory-page-controls button");
  });
});
