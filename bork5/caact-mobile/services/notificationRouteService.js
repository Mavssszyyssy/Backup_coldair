export function resolveNotificationRoute(item = {}, role = "") {
  const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();
  const normalizedRole = String(role || item.role || "").toLowerCase();
  const route = typeof item.route === "string" ? item.route : "";

  if (normalizedRole === "technician") {
    if (route.startsWith("/technician/")) return route;
    if (route === "/tech/tasks" || route.startsWith("/tech/tasks/")) return "/technician/tasks";
    if (route === "/tech/dashboard") return "/technician/dashboard";
  }

  if (item.type === "warranty" || item.targetType === "warranty" || text.includes("warranty")) {
    return item.targetId ? `/customer/units/${encodeURIComponent(item.targetId)}?page=warranty` : "/customer/units";
  }
  if (item.targetType === "unit" || ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(item.category)) {
    return item.targetId ? `/customer/units/${encodeURIComponent(item.targetId)}?page=amp` : "/customer/units";
  }
  if (normalizedRole === "customer") {
    if (route === "/customer/service-requests") return "/customer/services";
    if (route === "/my-orders") return "/customer/orders";
    if (route === "/myunit" || route.startsWith("/myunit/")) return "/customer/units";
    if (route === "/contact") return "/customer/contact";
    if (route === "/settings") return "/customer/settings";
    if (route === "/get-the-app") return "/customer/services";
  }
  if (route.startsWith("/")) return route;

  if (normalizedRole === "technician") {
    if (text.includes("part")) return "/technician/tasks";
    if (item.type === "order" || text.includes("order") || text.includes("task") || text.includes("work order")) {
      return "/technician/tasks";
    }
    return "/technician/dashboard";
  }

  if (text.includes("service") || text.includes("appointment") || text.includes("request")) {
    return "/customer/home";
  }
  if (item.type === "order" || text.includes("order")) return "/customer/orders";
  if (item.type === "account") return "/customer/settings";
  return "/customer/home";
}
