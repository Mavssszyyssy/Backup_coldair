import { expect, it } from 'vitest';
import { getOrderAction } from './orderActions';
it('dispatches new and legacy COD orders without payment approval', () => {
  for (const workflowStatus of ['to_pay', 'to_deliver', 'to_dispatch']) expect(getOrderAction({ paymentMethod: 'cod', workflowStatus })).toEqual({ label: 'Mark Dispatched', action: 'dispatch' });
  expect(getOrderAction({ paymentMethod: 'gcash', workflowStatus: 'to_pay' }).action).toBe('approve');
});
