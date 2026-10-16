export const resolveCustomerNotificationRoute = (notification = {}) => {
  const route = typeof notification.route === "string" ? notification.route : "";
  const routeQuery = new URLSearchParams(route.includes("?") ? route.split("?")[1] : "");
  const routeUnitMatch = route.match(/^\/customer\/units\/([^/?]+)/);
  const rawTargetId = notification.targetId
    || routeQuery.get("orderId")
    || routeQuery.get("messageId")
    || routeQuery.get("requestId")
    || (routeUnitMatch ? decodeURIComponent(routeUnitMatch[1]) : "");
  const targetId = rawTargetId ? encodeURIComponent(rawTargetId) : "";
  const targetType = String(notification.targetType || "").toLowerCase();
  const category = String(notification.category || "").toLowerCase();
  const type = String(notification.type || "").toLowerCase();

  if (targetType === "order" || ["order", "payment", "delivery"].includes(type) || route.startsWith("/customer/orders")) {
    return targetId ? `/my-orders?orderId=${targetId}` : "/my-orders";
  }

  if (["contact", "contact_message"].includes(targetType) || route.startsWith("/customer/contact") || route.startsWith("/contact")) {
    return targetId ? `/contact?messageId=${targetId}` : "/contact";
  }

  if (
    ["unit", "warranty"].includes(targetType) ||
    type === "warranty" ||
    ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(category) ||
    route.startsWith("/customer/units")
  ) {
    const page = type === "warranty" || targetType === "warranty" || routeQuery.get("page") === "warranty"
      ? "warranty"
      : "amp";
    return targetId ? `/myunit?unitId=${targetId}&page=${page}` : "/myunit";
  }

  if (route === "/customer/settings") return "/settings";
  if (["service_request", "service"].includes(targetType) || route === "/customer/service-requests" || route === "/customer/services") {
    return targetId ? `/services?requestId=${targetId}` : "/services";
  }
  if (route === "/customer/home") return "/shop";
  if (route.startsWith("/")) return route;
  if (type === "service") return targetId ? `/services?requestId=${targetId}` : "/services";
  return "/settings";
};
