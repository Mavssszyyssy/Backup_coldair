import { describe, expect, it } from 'vitest';
import { alertCategory, operationalAlertRoute } from './operationalAlerts';
describe('operational alert destinations', () => {
  it.each(['admin', 'superadmin'])('covers transactions, requests and maintenance for %s', (role) => {
    const route = (tab) => role === 'admin' ? `/admin/services/${tab}` : `/superadmin/services?tab=${tab}`;
    for (const type of ['order', 'payment', 'delivery']) {
      expect(alertCategory({ type })).toBe('transactions');
      expect(operationalAlertRoute({ type }, role)).toBe(route('orders'));
    }
    for (const type of ['service', 'warranty']) expect(operationalAlertRoute({ type, targetType: 'service_request' }, role)).toBe(route('service-requests'));
    expect(operationalAlertRoute({ type: 'technician', targetType: 'task' }, role)).toBe(route('technicians'));
    expect(operationalAlertRoute({ type: 'service', targetType: 'maintenance_pipeline' }, role)).toBe('/manager/amp');
  });
});
