import { preloadLazyRoute } from "./lazyWithReload";

const publicRoutes = {
  "/home": "Home", "/shop": "Shop", "/contact": "Contact", "/faq": "FaqPage",
  "/services": "Services", "/login": "Login", "/register": "Register", "/forgot-password": "ForgotPassword",
  "/terms": "LegalPolicyPage", "/privacy": "LegalPolicyPage",
};
const customerRoutes = { "/settings": "Settings", "/my-orders": "MyOrders", "/myunit": "MyUnit", "/checkout": "Checkout" };
const adminRoutes = {
  dashboard: "AdminDashboard", inventory: "AdminInventory", services: "AdminServices",
  reports: "AdminReports", profile: "AdminProfile", settings: "AdminSettings",
  reorder: "AdminInventory", "serial-qrs": "AdminInventory", store: "AdminInventory",
  orders: "AdminServices", maintenance: "AdminServices", technicians: "AdminServices", "service-requests": "AdminServices",
};
const superRoutes = {
  dashboard: "SuperAdminDashboard", inventory: "SuperAdminInventory", services: "SuperAdminServices",
  reports: "AdminReports", profile: "SuperAdminProfile", settings: "SuperAdminSettings",
  branches: "SuperAdminBranches", alerts: "SuperAdminAlerts",
  reorders: "SuperAdminInventory", "serial-qrs": "SuperAdminInventory",
  orders: "SuperAdminServices", maintenance: "SuperAdminServices", technicians: "SuperAdminServices",
};

export function navigationRouteName(pathname, role) {
  if (publicRoutes[pathname]) return publicRoutes[pathname];
  if (role === "customer" && customerRoutes[pathname]) return customerRoutes[pathname];
  const [, portal, screen] = pathname.split("/");
  if (role === "admin" && portal === "admin") return Object.hasOwn(adminRoutes, screen) ? adminRoutes[screen] : undefined;
  if (role === "superadmin" && portal === "superadmin") return Object.hasOwn(superRoutes, screen) ? superRoutes[screen] : undefined;
  if (pathname === "/manager/amp" && ["admin", "superadmin", "manager", "owner"].includes(role)) return "ManagerAmpDashboard";
  if (pathname === "/owner/amp" && ["superadmin", "owner"].includes(role)) return "OwnerAmpDashboard";
  return undefined;
}

// Warm code and allowlisted display reads together on navigation intent. This
// avoids waiting for a route download before starting its data request.
export function listenForNavigationIntent({ role, root = document, location = window.location, connection = navigator.connection, preload = preloadLazyRoute, preloadData } = {}) {
  if (connection?.saveData || /^(?:slow-)?2g$/.test(connection?.effectiveType || "")) return () => {};
  let timer;
  const onIntent = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target?.closest?.("a[href],button[data-preload-path]");
    if (!target || target.disabled || target.hasAttribute("download") || target.target === "_blank") return;
    let url;
    try { url = new URL(target.dataset.preloadPath || target.getAttribute("href"), location.href); } catch { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    const name = navigationRouteName(url.pathname, role);
    if (!name) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      Promise.resolve().then(() => preload(name)).catch(() => {});
      if (preloadData) Promise.resolve().then(() => preloadData(url, role)).catch(() => {});
    }, event.type === "pointerover" ? 80 : 0);
  };
  const cancel = (event) => {
    const target = event.target?.closest?.("a[href],button[data-preload-path]");
    if (target && !target.contains(event.relatedTarget)) clearTimeout(timer);
  };
  for (const type of ["pointerover", "focusin", "pointerdown"]) root.addEventListener(type, onIntent);
  root.addEventListener("pointerout", cancel);
  return () => {
    clearTimeout(timer);
    for (const type of ["pointerover", "focusin", "pointerdown"]) root.removeEventListener(type, onIntent);
    root.removeEventListener("pointerout", cancel);
  };
}
