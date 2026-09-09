import { it, expect } from 'vitest';
import { paymentMethodLabel } from './paymentMethodLabel';
import { operationalAlertRoute, alertCategory } from './operationalAlerts';
it('labels selected methods instead of naming the gateway', () => {
  expect(paymentMethodLabel('gcash')).toBe('GCash');
  expect(paymentMethodLabel('card')).toBe('Credit / debit card');
  expect(paymentMethodLabel('maya')).toBe('Maya');
  expect(paymentMethodLabel('cod')).toBe('Cash on Delivery');
  expect(paymentMethodLabel('paymongo')).toContain('method not recorded');
});
it('reorder alerts open the usable role-specific reorder tab', () => {
  expect(operationalAlertRoute({ targetType: 'reorder' }, 'admin')).toBe('/admin/inventory?tab=reorder');
  expect(operationalAlertRoute({ targetType: 'reorder' }, 'superadmin')).toBe('/superadmin/inventory?tab=reorders');
  expect(alertCategory({ targetType: 'reorder' })).toBe('requests');
});
