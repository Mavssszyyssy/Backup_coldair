export const isCodOrder = (order = {}) => /^(cod|cash on delivery)$/i.test(String(order.paymentMethod || '').trim());
export const getOrderAction = (order = {}) => {
  if (isCodOrder(order) && ['to_pay', 'to_deliver', 'to_dispatch'].includes(order.workflowStatus)) return { label: 'Mark Dispatched', action: 'dispatch' };
  return {
    to_pay: { label: 'Approve Payment', action: 'approve' },
    to_deliver: { label: 'Mark Dispatched', action: 'dispatch' },
    to_dispatch: { label: 'Mark Dispatched', action: 'dispatch' },
    to_install: { label: 'Mark Complete', action: 'complete' },
  }[order.workflowStatus];
};
