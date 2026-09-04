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
    expect(adminShared).toContain("--role-primary: #4f46e5");
    expect(adminShell).toContain("--primary: #4f46e5");
    expect(adminDashboard).toContain("linear-gradient(135deg, #4f46e5, #7c3aed)");
    expect(superShared).toContain("--role-primary: #4f46e5");
  });

  it("keeps dashboard styles from overriding the shared Admin sidebar", () => {
    const adminDashboard = source("ADMIN", "Dashboard", "styles.css");

    expect(adminDashboard).not.toMatch(/^\.admin-sidebar(?:[ .:{])/m);
    expect(adminDashboard).not.toMatch(/^\.admin-sidebar-overlay(?:[ .:{])/m);
    expect(adminDashboard).not.toMatch(/^\.burger-button(?:[ .:{])/m);
    expect(adminDashboard).toContain(".admin-dashboard .admin-sidebar");
  });

  it("protects inventory utility buttons from the generic card-button style", () => {
    const inventory = source("ADMIN", "Inventory", "styles.css");

    expect(inventory).toContain(".admin-card .inventory-serial-preview-close");
    expect(inventory).toContain(".admin-card .inventory-stock-quantity");
    expect(inventory).toContain(".admin-card .inventory-page-controls button");
  });

  it("keeps AMP and ordinary reports as distinct destinations", () => {
    const adminSidebar = source("ADMIN", "Common", "AdminSidebar.js");
    const superadminSidebar = source("SUPERADMIN", "Common", "SuperAdminSidebar.js");
    const ampShell = source("AMP", "AmpDashboardShell.js");

    expect(adminSidebar).toContain('{ to: "/manager/amp", label: "AMP Dashboard"');
    expect(adminSidebar).toContain('{ to: "/admin/reports", label: "Reports"');
    expect(superadminSidebar).toContain('{ to: "/manager/amp", label: "AMP Planning"');
    expect(superadminSidebar).toContain('{ to: "/superadmin/reports", label: "Reports"');
    expect(ampShell).toContain('to: "/admin/dashboard"');
    expect(ampShell).toContain('to: "/superadmin/dashboard"');
  });

  it("connects customer My Units to the AMP report center", () => {
    const myUnits = source("myunit", "MyUnit.js");

    expect(myUnits).toContain("AmpReportCenter");
    expect(myUnits).toContain('title="Your AMP Maintenance Reports"');
    expect(myUnits).toContain("unitId: unit.backendUnitId || unit.id");
  });

  it("opens daily AMP pipeline alerts in the maintenance dashboard", () => {
    const adminNotifications = source("ADMIN", "Common", "AdminNotificationsBell.js");
    const superadminNotifications = source("SUPERADMIN", "Common", "SuperAdminNotificationsBell.js");

    expect(adminNotifications).toContain('["amp_pipeline", "maintenance_pipeline"]');
    expect(superadminNotifications).toContain("['amp_pipeline', 'maintenance_pipeline']");
    expect(adminNotifications).toContain('return "/manager/amp"');
    expect(superadminNotifications).toContain("return '/manager/amp'");
  });
});
