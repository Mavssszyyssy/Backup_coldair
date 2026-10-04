export const isCodOrder = (order = {}) => /^(cod|cash on delivery)$/i.test(String(order.paymentMethod || '').trim());

const POST_DISPATCH_DELIVERY_STATUSES = new Set([
  'dispatched',
  'out for delivery',
  'arrived',
  'installing',
  'completed',
]);

export const hasDispatchStarted = (order = {}) => {
  const deliveryStatus = String(order.deliveryStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  return Boolean(order.dispatchedAt) || POST_DISPATCH_DELIVERY_STATUSES.has(deliveryStatus);
};

export const canCancelOrder = (order = {}) =>
  ['to_pay', 'to_deliver', 'to_dispatch', 'for_rescheduling'].includes(order.workflowStatus) &&
  !hasDispatchStarted(order);

export const getOrderAction = (order = {}) => {
  if (order.workflowStatus === 'to_dispatch' && hasDispatchStarted(order)) return undefined;
  if (isCodOrder(order) && ['to_pay', 'to_deliver', 'to_dispatch'].includes(order.workflowStatus)) return { label: 'Mark Dispatched', action: 'dispatch' };
  return {
    to_pay: { label: 'Approve Payment', action: 'approve' },
    to_deliver: { label: 'Mark Dispatched', action: 'dispatch' },
    to_dispatch: { label: 'Mark Dispatched', action: 'dispatch' },
    to_install: { label: 'Mark Complete', action: 'complete' },
  }[order.workflowStatus];
};
