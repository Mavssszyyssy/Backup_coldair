export const resolveCustomerNotificationRoute = (notification = {}) => {
  if (
    notification.targetType === "unit" ||
    ["maintenance_due", "amp_due_soon", "amp_overdue"].includes(notification.category)
  ) return "/myunit";
  if (typeof notification.route === "string" && notification.route.startsWith("/")) return notification.route;
  if (notification.type === "order" || notification.targetType === "order") return "/my-orders";
  if (["service", "warranty"].includes(notification.type)) return "/get-the-app";
  return "/settings";
};
