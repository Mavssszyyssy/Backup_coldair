import fs from "fs";
import path from "path";
import { describe, expect, test } from "vitest";

const source = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("cross-surface readiness gaps", () => {
  test("web login uses the shared account-bound email verification challenge", () => {
    const login = source("src/components/login/Login.js");
    const context = source("src/context/UserContext.js");
    expect(login).toContain("Email verification code");
    expect(login).toContain("Resend code");
    expect(context).toContain("const verifyLoginEmail = async (challengeToken, code)");
    expect(context).toContain("const resendLoginEmail = async (challengeToken)");
  });

  test("catalogue and registered units distinguish loading from empty", () => {
    expect(source("src/components/shop/ShopCatalogue.js")).toContain("Loading the latest available AC units");
    expect(source("src/components/myunit/MyUnit.js")).toContain("Loading your registered AC units");
  });

  test("admin orders load full proof media only on demand", () => {
    const orders = source("src/components/ADMIN/Orders/AdminOrders.js");
    expect(orders).toContain("View technician proof picture");
    expect(orders).toContain("/tasks/${encodeURIComponent(taskId)}");
    expect(orders).toContain("proof?.hasAfterPhotos");
    expect(orders).toContain("Paid on delivery");
    expect(orders).not.toContain("Customer Sign-off:");
    expect(orders).not.toContain("No sign-off yet");
    expect(orders).toContain("hasInstallationPhoto && hasCustomerSignoff && hasTechnicianSummary");
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
    expect(source("src/components/AMP/ManagerAmpDashboard.js")).toContain('humanLabel(unit.recommendedService, "not yet assessed")');
  });

  test("AMP labels distinguish recorded recommendations from predictions and booked revenue", () => {
    const reports = source("src/components/AMP/AmpReportCenter.js");
    const owner = source("src/components/AMP/OwnerAmpDashboard.js");
    expect(reports).toContain("Next service plan");
    expect(reports).toContain("Model and parts history");
    expect(reports).not.toContain('label: "Predictive Maintenance"');
    expect(owner).toContain("These are not confirmed bookings");
    expect(owner).toContain("Assumed value per service");
    expect(owner).toContain("It is not a failure rate, reliability score, or unit diagnosis");
    expect(reports).toContain("Suggested servicing date");
    expect(reports).not.toContain("Operating environment");
    expect(reports).not.toContain("Technician preparation");
    expect(source("src/components/AMP/ManagerAmpDashboard.js")).toContain("compressor/motor and control board");
  });

  test("Superadmin AMP is a filtered all-branch oversight view instead of a duplicate branch workspace", () => {
    const manager = source("src/components/AMP/ManagerAmpDashboard.js");
    const shell = source("src/components/AMP/AmpDashboardShell.js");
    expect(manager).toContain('"AMP · Maintenance across branches"');
    expect(manager).toContain('<option value="all">All branches</option>');
    expect(manager).toContain("branch=${encodeURIComponent(selectedBranch)}");
    expect(manager).toContain("const SERVICE_WINDOWS = [30, 90, 180, 365]");
    expect(manager).toContain("[...BRANCHES, UNASSIGNED_BRANCH]");
    expect(manager).toContain("unit{unassignedCount === 1 ? \" has\" : \"s have\"} no responsible branch");
    expect(manager).toContain("days=${serviceWindow}");
    expect(manager).toContain("Branch admins remain responsible for service processing");
    expect(manager).toContain('<PipelineTable units={group.units} onSelectPlan={selectPlan} />');
    expect(shell).toContain('isOwner ? "Branch maintenance" : "My branch maintenance"');
    expect(source("src/components/SUPERADMIN/Common/SuperAdminSidebar.js")).toContain('{ to: "/manager/amp", label: "AMP Planning"');
  });

  test("superadmin alerts translate internal payment codes", () => {
    const contents = source("src/components/SUPERADMIN/Dashboard/SuperAdminAlerts.js");
    expect(contents).toContain("Cash on Delivery");
    expect(contents).toContain("Payment due on delivery");
    expect(contents).toContain("paymentSummary(order)");
  });

  test("superadmin no longer exposes the Processing Sales module", () => {
    const app = source("src/App.js");
    const sidebar = source("src/components/SUPERADMIN/Common/SuperAdminSidebar.js");
    const dashboard = source("src/components/SUPERADMIN/Dashboard/SuperAdminDashboard.js");
    expect(app).not.toContain("SuperAdminSales");
    expect(app).not.toContain('/superadmin/sales');
    expect(sidebar).not.toContain("Processing Sales");
    expect(dashboard).not.toContain('/superadmin/sales');
    expect(dashboard).toContain("SalesTrendChart");
  });

  test("branch admins see a fixed QR branch scope while Superadmin keeps the branch filter", () => {
    const registry = source("src/components/ADMIN/SerialQr/AdminSerialQr.js");
    expect(registry).toContain('const isSuperAdmin = user?.role === "superadmin"');
    expect(registry).toContain('className="serialqr-branch-scope"');
    expect(registry).toContain("{assignedBranch} branch");
    expect(registry).toContain('<option value="all">All branches</option>');
  });
});
