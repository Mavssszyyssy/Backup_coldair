import fs from "fs";
import path from "path";
import { describe, expect, test } from "vitest";

const source = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("cross-surface readiness gaps", () => {
  test("customer protected routes require authenticator setup", () => {
    const app = source("src/App.js");
    const login = source("src/components/login/Login.js");
    const setup = source("src/components/security/AuthenticatorSetup.js");
    expect(app).toContain("/security/setup-authenticator");
    expect(app).toContain("!user?.security?.totpEnabled");
    expect(app).toContain('isAuthenticated && userRole === "customer"');
    expect(login).toContain("loggedInUser?.security?.totpEnabled");
    expect(setup).toContain("/security/recovery-codes/regenerate");
  });

  test("catalogue and registered units distinguish loading from empty", () => {
    expect(source("src/components/shop/ShopCatalogue.js")).toContain("Loading the latest available AC units");
    expect(source("src/components/myunit/MyUnit.js")).toContain("Loading your registered AC units");
  });

  test("admin orders load full proof media only on demand", () => {
    const orders = source("src/components/ADMIN/Orders/AdminOrders.js");
    expect(orders).toContain("View proof photos");
    expect(orders).toContain("/tasks/${encodeURIComponent(taskId)}");
    expect(orders).toContain("proof?.hasAfterPhotos");
    expect(orders).toContain("Paid on delivery");
  });

  test("admin scheduling uses the Philippine business date", () => {
    const orders = source("src/components/ADMIN/Orders/AdminOrders.js");
    const technicians = source("src/components/ADMIN/Technicians/AdminTechnician.js");
    expect(orders).toContain("formatBusinessDateKey()");
    expect(technicians).toContain("formatScheduledDate(task.scheduledDate)");
  });

  test("AMP reports translate capacity codes into customer-facing wording", () => {
    const reports = source("src/components/AMP/AmpReportCenter.js");
    expect(reports).toContain('room_size_required: "Room size needed"');
    expect(reports).toContain('insufficient: "May be too small for the room"');
    expect(reports).toContain("capacityAssessmentLabel(maintenance.capacityAssessment?.status)");
    expect(source("src/components/AMP/OwnerAmpDashboard.js")).toContain("serviceLabel(item.serviceType)");
    expect(source("src/components/AMP/ManagerAmpDashboard.js")).toContain('humanLabel(unit.recommendedService, "regular_cleaning")');
  });

  test("AMP labels distinguish recorded recommendations from predictions and booked revenue", () => {
    const reports = source("src/components/AMP/AmpReportCenter.js");
    const owner = source("src/components/AMP/OwnerAmpDashboard.js");
    expect(reports).toContain("Next Maintenance Recommendation");
    expect(reports).toContain("Aggregate Recorded Service Analysis");
    expect(reports).not.toContain('label: "Predictive Maintenance"');
    expect(owner).toContain("these are not confirmed bookings");
    expect(owner).toContain("Assumed service value");
    expect(owner).toContain("It is not a failure rate, reliability score, or unit diagnosis");
  });

  test("superadmin queues translate internal payment codes", () => {
    for (const component of ["SuperAdminAlerts.js", "SuperAdminSales.js"]) {
      const contents = source(`src/components/SUPERADMIN/Dashboard/${component}`);
      expect(contents).toContain("Cash on Delivery");
      expect(contents).toContain("Payment due on delivery");
      expect(contents).toContain("paymentSummary(order)");
    }
  });
});
