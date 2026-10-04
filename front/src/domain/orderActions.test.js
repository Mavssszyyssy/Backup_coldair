import { expect, it } from 'vitest';
import { canCancelOrder, getOrderAction } from './orderActions';
it('dispatches new and legacy COD orders without payment approval', () => {
  for (const workflowStatus of ['to_pay', 'to_deliver', 'to_dispatch']) expect(getOrderAction({ paymentMethod: 'cod', workflowStatus })).toEqual({ label: 'Mark Dispatched', action: 'dispatch' });
  expect(getOrderAction({ paymentMethod: 'cod', workflowStatus: 'to_dispatch', deliveryStatus: 'dispatched' })).toBeUndefined();
  expect(getOrderAction({ paymentMethod: 'gcash', workflowStatus: 'to_pay' }).action).toBe('approve');
});

it('does not expose dispatch or cancellation after technician arrival starts', () => {
  for (const deliveryStatus of ['dispatched', 'out_for_delivery', 'arrived', 'installing']) {
    const order = { paymentMethod: 'cod', workflowStatus: 'to_dispatch', deliveryStatus };
    expect(getOrderAction(order)).toBeUndefined();
    expect(canCancelOrder(order)).toBe(false);
  }

  const dispatchedOrder = {
    paymentMethod: 'cod',
    workflowStatus: 'to_dispatch',
    deliveryStatus: 'pending',
    dispatchedAt: '2026-10-05T01:00:00.000Z',
  };
  expect(getOrderAction(dispatchedOrder)).toBeUndefined();
  expect(canCancelOrder(dispatchedOrder)).toBe(false);
});
