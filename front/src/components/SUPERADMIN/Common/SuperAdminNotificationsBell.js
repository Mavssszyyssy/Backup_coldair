import { operationalAlertRoute } from "../../../domain/operationalAlerts";
import StaffNotificationsBell from "../../common/StaffNotificationsBell";

const routeForNotification = (item = {}) => {
  if (String(item.route || '').startsWith('/superadmin/')) return operationalAlertRoute(item, 'superadmin');
  if (["order", "payment", "delivery", "service", "warranty", "technician"].includes(item.type)) return operationalAlertRoute(item, "superadmin");
  const targetType = String(item.targetType || item.category || '').toLowerCase();
  if (['amp_pipeline', 'maintenance_pipeline'].includes(targetType)) return '/manager/amp';
  if (['contact', 'contact_message', 'inventory', 'stock', 'reorder', 'warranty', 'claim', 'service', 'service_request', 'parts_request', 'task', 'technician', 'order'].includes(targetType)) {
    return operationalAlertRoute(item, 'superadmin');
  }
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
  if (text.includes('complaint') || text.includes('refund') || text.includes('cancel')) return '/superadmin/alerts';
  if (text.includes('stock') || text.includes('inventory') || text.includes('reorder')) return '/superadmin/inventory?tab=reorders';
  if (text.includes('technician') || text.includes('task')) return '/superadmin/services?tab=technicians';
  if (item.type === 'order' || text.includes('order')) return '/superadmin/services?tab=orders';
  return '/superadmin/dashboard';
};

export default function SuperAdminNotificationsBell() {
  return <StaffNotificationsBell resolveRoute={routeForNotification} superadmin />;
}
