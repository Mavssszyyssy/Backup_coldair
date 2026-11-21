import { beforeEach, expect, test, vi } from "vitest";
import { navigationDataRequests, primeNavigationData } from "./navigationData";
import { apiRequest } from "../config/api";
vi.mock("../config/api", () => ({ apiRequest: vi.fn() }));
const url = (path) => new URL(path, "https://www.coldair-act.online");
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); apiRequest.mockResolvedValue({}); });

test.each([
  ["/shop", null, "/products/public"],
  ["/myunit", "customer", "/amp/customer/units"],
  ["/contact", "customer", "/contact-messages/me"],
  ["/settings", "customer", "/users/addresses"],
  ["/admin/dashboard", "admin", "/dashboard/me"],
  ["/admin/inventory", "admin", "/products?view=inventory&branch=Cavite"],
  ["/admin/inventory?tab=reorder", "admin", "/reorders/mine"],
  ["/my-orders", "customer", "/orders/me?page=1&limit=10"],
  ["/admin/services?tab=service-requests", "admin", "/service-requests"],
  ["/admin/services?tab=customer-messages", "admin", "/contact-messages?page=1&limit=20"],
  ["/superadmin/inventory", "superadmin", "/products?includeArchived=true&view=inventory"],
  ["/superadmin/inventory?tab=checker", "superadmin", "/products?view=inventory"],
  ["/superadmin/inventory?tab=reorders", "superadmin", "/reorders"],
  ["/superadmin/branches", "superadmin", "/users?role=admin"],
  ["/superadmin/alerts", "superadmin", "/products/stock-status"],
  ["/superadmin/settings", "superadmin", "/system-settings/email-domains"],
  ["/manager/amp", "admin", "/amp/report-units"],
  ["/owner/amp", "superadmin", "/amp/report-units"],
])("preloads the actual display read for %s", (path, role, expected) => {
  expect(navigationDataRequests(url(path), role, "Cavite").map(([p]) => p)).toContain(expected);
});

test.each(["/checkout", "/order-confirmation/123", "/receipt/123", "/login", "/home", "/faq", "/admin/dashboard", "/superadmin/branches", "/admin/inventory?tab=serial-qr"])("does not speculate about transactional, static or unauthorized pages: %s", (path) => {
  expect(navigationDataRequests(url(path), "customer", "Cavite")).toEqual([]);
});

test("a changed session cancels delayed intent and shop stock uses the resolved delivery branch", async () => {
  sessionStorage.setItem("userRole", "customer");
  await primeNavigationData(url("/superadmin/branches"), "superadmin");
  expect(apiRequest).not.toHaveBeenCalled();
  apiRequest.mockResolvedValue({ deliveryBranch: "Cavite" });
  await primeNavigationData(url("/shop"), "customer");
  expect(apiRequest).toHaveBeenNthCalledWith(1, "/users/addresses?resolveDeliveryBranch=true", { display: true, silentConnection: true });
  expect(apiRequest).toHaveBeenNthCalledWith(2, "/products/public?branch=Cavite", { display: true, silentConnection: true });
});
