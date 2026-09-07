export function alertCategory(item = {}) {
  const target = item.targetType || item.category;
  if (['maintenance_pipeline', 'amp_pipeline', 'amp_due_soon', 'amp_overdue', 'maintenance_due'].includes(target) || item.type === 'technician') return 'maintenance';
  if (['order', 'payment', 'delivery'].includes(item.type) || target === 'order') return 'transactions';
  if (['service', 'warranty'].includes(item.type) || ['contact', 'contact_message', 'parts_request'].includes(target)) return 'requests';
  return 'other';
}

export function operationalAlertRoute(item = {}, role = 'admin') {
  const target = item.targetType || item.category;
  const superadmin = role === 'superadmin';
  const serviceRoute = (tab) => superadmin ? `/superadmin/services?tab=${tab}` : `/admin/services/${tab}`;
  if (['maintenance_pipeline', 'amp_pipeline'].includes(target)) return '/manager/amp';
  if (['contact', 'contact_message'].includes(target)) return superadmin ? '/superadmin/services?tab=customer-messages' : '/admin/services?tab=customer-messages';
  if (['task', 'technician'].includes(target) || item.type === 'technician') return serviceRoute('technicians');
  if (['warranty', 'claim', 'service', 'service_request', 'parts_request'].includes(target) || ['service', 'warranty'].includes(item.type)) return serviceRoute('service-requests');
  if (['order', 'payment', 'delivery'].includes(item.type) || target === 'order') return serviceRoute('orders');
  if (['stock', 'inventory', 'reorder'].includes(target) || item.type === 'inventory') return superadmin ? '/superadmin/inventory' : '/admin/inventory';
  const prefix = superadmin ? '/superadmin/' : '/admin/';
  return String(item.route || '').startsWith(prefix) ? item.route : `${prefix}dashboard`;
}
