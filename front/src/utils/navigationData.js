import { apiRequest } from "../config/api";
import { getAuthSessionItem, getSessionActiveBranch } from "./authSession";
import { formatBusinessDateKey } from "./dateTime";

// Only existing list/reference reads are eligible. Payment, receipt, service
// generation and checkout validation always remain owned by their screen.
export function navigationDataRequests(url, role, branch = "") {
  const path = url.pathname;
  let tab = url.searchParams.get("tab");
  if (path === "/shop") return role === "customer"
    ? [["/users/addresses?resolveDeliveryBranch=true", { display: true }]]
    : [["/products/public", { display: true }]];
  if (role === "customer") {
    if (path === "/my-orders") {
      const query = new URLSearchParams({ page: "1", limit: "10" });
      const status = url.searchParams.get("status");
      if (["to_pay", "to_deliver", "to_dispatch", "to_install", "for_rescheduling", "complete", "cancelled"].includes(status)) query.set("orderStatus", status);
      return [[`/orders/me?${query}`]];
    }
    if (path === "/myunit") return [["/amp/customer/units"]];
    if (path === "/contact") return [["/contact-messages/me"]];
    if (path === "/settings") return [["/users/addresses"]];
    return [];
  }
  if (path === "/manager/amp" && ["admin", "superadmin", "manager", "owner"].includes(role)) return [["/amp/manager/pipeline?days=30&page=1&pageSize=10"], ["/amp/report-units"]];
  if (path === "/owner/amp" && ["superadmin", "owner"].includes(role)) return [["/amp/owner/forecast?months=12&includeHistory=false"], ["/amp/report-units"]];
  const prefix = role === "admin" ? "/admin/" : role === "superadmin" ? "/superadmin/" : "";
  if (!prefix || !path.startsWith(prefix)) return [];
  const [routeScreen, subScreen] = path.slice(prefix.length).split("/");
  let screen = routeScreen;
  if (screen === "services" && !tab && subScreen) tab = subScreen;
  if (["reorder", "reorders", "serial-qrs", "store"].includes(screen)) {
    tab = screen === "serial-qrs" ? "serial-qr" : screen === "store" ? null : "reorder";
    screen = "inventory";
  }
  if (["orders", "maintenance", "technicians", "service-requests"].includes(screen)) {
    tab = ["maintenance", "service-requests"].includes(screen) ? "service-requests" : screen;
    screen = "services";
  }
  if (screen === "dashboard") return [["/dashboard/me"]];
  if (screen === "branches" && role === "superadmin") return [["/users?role=admin"], ["/branches"]];
  if (screen === "settings" && role === "superadmin") return [["/system-settings/email-domains"]];
  if (screen === "alerts") return [["/notifications/me?scope=operations"], ["/orders?view=compact&limit=200"], ["/products/stock-status"]];
  if (screen === "reports") {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 86_400_000);
    const query = new URLSearchParams({ from: formatBusinessDateKey(from), to: formatBusinessDateKey(to), branch: role === "superadmin" ? "all" : branch });
    return [[`/reports/filter-options?${query}`]];
  }
  if (screen === "inventory") {
    if (tab === "reorders" || tab === "reorder") return role === "admin"
      ? [["/products/low-stock"], ["/reorders/mine"]] : [["/reorders"]];
    // Legacy QR reads can repair serial records. Keep those screen-owned;
    // its display cache still handles return visits without speculative writes.
    if (tab === "serial-qr") return [];
    if (role === "superadmin") return tab === "checker" ? [["/products?view=inventory"]] : [["/products?includeArchived=true&view=inventory"]];
    return branch ? [[`/products?view=inventory&branch=${encodeURIComponent(branch)}`]] : [];
  }
  if (screen === "services") {
    if (tab === "customer-messages") return [["/contact-messages?page=1&limit=20"]];
    if (tab === "service-requests") return [["/service-requests"], ["/warranties/claims"]];
    if (tab === "technicians" || tab === "daily-schedule") return [["/users?role=technician"], ["/tasks"]];
    return [["/orders"], ["/tasks?limit=75"]];
  }
  return [];
}

export function primeNavigationData(url, role) {
  // Delayed intent must never issue a former account's requests after logout or
  // a role switch. apiRequest separately scopes its cache by token and branch.
  if ((getAuthSessionItem("userRole") || null) !== (role || null)) return Promise.resolve([]);
  const token = getAuthSessionItem("accessToken");
  return Promise.allSettled(navigationDataRequests(url, role, getSessionActiveBranch()).map(async ([path, options]) => {
    const result = await apiRequest(path, { ...options, silentConnection: true });
    if (path.startsWith("/users/addresses?") && result.deliveryBranch && getAuthSessionItem("userRole") === role && getAuthSessionItem("accessToken") === token) {
      await apiRequest(`/products/public?branch=${encodeURIComponent(result.deliveryBranch)}`, { display: true, silentConnection: true });
    }
    return result;
  }));
}
