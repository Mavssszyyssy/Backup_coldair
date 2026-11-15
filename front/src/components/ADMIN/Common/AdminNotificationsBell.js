import { operationalAlertRoute } from "../../../domain/operationalAlerts";
import StaffNotificationsBell from "../../common/StaffNotificationsBell";

const adminRouteAliases = {
  "/admin/orders": "/admin/services/orders",
  "/admin/maintenance": "/admin/services/service-requests",
  "/admin/service-requests": "/admin/services/service-requests",
  "/admin/technicians": "/admin/services/technicians",
};

const resolveNotificationRoute = (item = {}) => {
  if (String(item.route || "").startsWith("/admin/")) {
    return operationalAlertRoute(item, "admin") || adminRouteAliases[item.route] || item.route;
  }
  if (["order", "payment", "delivery", "service", "warranty", "technician"].includes(item.type)) return operationalAlertRoute(item, "admin");
  const targetType = String(item.targetType || item.category || "").toLowerCase();
  if (["amp_pipeline", "maintenance_pipeline"].includes(targetType)) return "/manager/amp";
  if (["contact", "contact_message", "inventory", "stock", "reorder", "warranty", "claim", "service", "service_request", "parts_request", "task", "technician", "order"].includes(targetType)) {
    return operationalAlertRoute(item, "admin");
  }
  const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();
  if (text.includes("stock") || text.includes("inventory")) return "/admin/reorder";
  if (text.includes("task") || text.includes("technician")) return "/admin/services/technicians";
  if (item.type === "order" || text.includes("order")) return "/admin/services/orders";
  return "/admin/dashboard";
};

export default function AdminNotificationsBell() {
  return <StaffNotificationsBell resolveRoute={resolveNotificationRoute} />;
}
