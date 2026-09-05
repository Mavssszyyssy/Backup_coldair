export const resolveCustomerNotificationRoute = (notification = {}) => {
  const route = typeof notification.route === "string" ? notification.route : "";
  if (
    notification.targetType === "unit" ||
    ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(notification.category)
  ) return "/myunit";
  if (route.startsWith("/customer/units")) return "/myunit";
  if (route === "/customer/orders") return "/my-orders";
  if (route === "/customer/contact") return "/contact";
  if (route === "/customer/settings") return "/settings";
  if (route === "/customer/service-requests" || route === "/customer/services") return "/get-the-app";
  if (route === "/customer/home") return "/shop";
  if (route.startsWith("/")) return route;
  if (notification.type === "order" || notification.targetType === "order") return "/my-orders";
  if (["service", "warranty"].includes(notification.type)) return "/get-the-app";
  return "/settings";
};
