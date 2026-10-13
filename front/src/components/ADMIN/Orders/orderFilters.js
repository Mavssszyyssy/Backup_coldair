export const ORDER_WORKFLOW_OPTIONS = [
  { value: 'all', label: 'All order stages' },
  { value: 'to_pay', label: 'Awaiting payment' },
  { value: 'to_deliver', label: 'Preparing order' },
  { value: 'to_dispatch', label: 'Ready to dispatch' },
  { value: 'to_install', label: 'Installation pending' },
  { value: 'for_rescheduling', label: 'For rescheduling' },
  { value: 'complete', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ORDER_PAYMENT_OPTIONS = [
  { value: 'all', label: 'All payment states' },
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due on delivery' },
  { value: 'pending', label: 'Payment pending' },
  { value: 'issue', label: 'Payment issue' },
];

export const ORDER_DATE_OPTIONS = [
  { value: 'all', label: 'Any order date' },
  { value: 'today', label: 'Placed today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
];

const normalized = (value) => String(value || '').trim().toLowerCase();

export const getOrderBranch = (order = {}) =>
  String(order.stockSourceBranch || order.customerBranch || '').trim();

export const getOrderPaymentFilterKey = (order = {}) => {
  const method = normalized(order.paymentMethod);
  const status = normalized(order.paymentStatus || order.receipt?.paymentStatus);
  const isCod = method === 'cod' || method.includes('cash on delivery');

  if (isCod) return order.codCollection?.collectedAt ? 'paid' : 'due';
  if (order.paymongo?.paidAt || status === 'paid' || status === 'verified') return 'paid';
  if (['failed', 'cancelled', 'expired', 'refunded', 'rejected'].includes(status)) return 'issue';
  return 'pending';
};

const orderSearchValues = (order = {}) => {
  const address = order.address || {};
  const itemValues = (order.items || []).flatMap((item) => [
    item.name,
    item.model,
    item.sku,
    item.specs,
    ...(item.serialNumbers || []),
    ...(item.serialUnits || []).flatMap((unit) => [unit?.serialNumber, unit?.qrCode]),
  ]);

  return [
    order.orderCode,
    order.id,
    order.customerName,
    order.assignedTechnician,
    order.trackingNumber,
    order.workflowLabel,
    order.receipt?.receiptNumber,
    order.receipt?.paymentReference,
    order.paymongo?.referenceNumber,
    order.customerBranch,
    order.stockSourceBranch,
    address.name,
    address.phone,
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.region,
    address.postalCode,
    ...itemValues,
  ];
};

export const orderMatchesSearch = (order, search) => {
  const query = normalized(search);
  if (!query) return true;
  return orderSearchValues(order).some((value) => normalized(value).includes(query));
};

export const orderMatchesDateRange = (order, dateRange, now = new Date()) => {
  if (!dateRange || dateRange === 'all') return true;
  const orderDate = new Date(order?.createdAt || '');
  if (Number.isNaN(orderDate.getTime())) return false;
  if (orderDate > now) return false;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (dateRange === 'today') return orderDate >= start;

  const days = dateRange === 'last_7_days' ? 7 : dateRange === 'last_30_days' ? 30 : 0;
  if (!days) return true;
  start.setDate(start.getDate() - (days - 1));
  return orderDate >= start;
};

export const filterCustomerOrders = (orders = [], filters = {}, now = new Date()) =>
  orders.filter((order) => {
    if (!orderMatchesSearch(order, filters.search)) return false;
    if (filters.workflow && filters.workflow !== 'all' && normalized(order.workflowStatus) !== normalized(filters.workflow)) return false;
    if (filters.payment && filters.payment !== 'all' && getOrderPaymentFilterKey(order) !== filters.payment) return false;
    if (filters.branch && filters.branch !== 'all' && normalized(getOrderBranch(order)) !== normalized(filters.branch)) return false;
    return orderMatchesDateRange(order, filters.dateRange, now);
  });

export const collectOrderBranches = (orders = []) => Array.from(
  new Set(orders.map(getOrderBranch).filter(Boolean)),
).sort((a, b) => a.localeCompare(b));

export const countActiveOrderFilters = (filters = {}) => [
  normalized(filters.search),
  filters.workflow && filters.workflow !== 'all',
  filters.payment && filters.payment !== 'all',
  filters.branch && filters.branch !== 'all',
  filters.dateRange && filters.dateRange !== 'all',
  filters.queue && filters.queue !== 'all',
].filter(Boolean).length;
