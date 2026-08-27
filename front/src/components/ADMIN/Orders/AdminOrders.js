import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../Common/AdminLayout';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { appendAuditLog } from '../../../utils/auditLogs';
import './AdminOrders.css';

const statusActionMap = {
  to_pay: { label: 'Approve Payment', action: 'approve' },
  to_deliver: { label: 'Mark Dispatched', action: 'dispatch' },
  to_install: { label: 'Mark Complete', action: 'complete' }
};

const ORDER_PAGE_SIZE = 10;
const TIME_SLOT_OPTIONS = [
  '9:00 AM - 12:00 PM',
  '1:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
];

const getTodayDateInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const isPastCalendarDate = (value) => Boolean(value && String(value) < getTodayDateInput());

const getInventoryQrPayload = (serialNumber, storedQrCode = '') => {
  const serial = String(serialNumber || '').trim();
  const qrCode = String(storedQrCode || '').trim();
  if (qrCode) return qrCode;
  if (!serial) return '';
  return `AC_UNIT:${serial}`;
};

const getInventoryQrValue = (serialNumber, storedQrCode = '') => {
  const payload = getInventoryQrPayload(serialNumber, storedQrCode);
  if (!payload) return '';
  if (typeof window === 'undefined') return payload;
  const params = new URLSearchParams();
  if (serialNumber) params.set('serial', serialNumber);
  params.set('qr', payload);
  return `${window.location.origin}/tech/field-registration?${params.toString()}`;
};

const buildOrderUnitQrPayload = (order = {}, item = {}, unitNumber = 1) =>
  [
    `ORDER:${order.orderCode || order.id || ''}`,
    `PRODUCT:${item.productId || item.sku || item.model || item.name || ''}`,
    `UNIT:${unitNumber}`,
  ].join('|');

const getOrderItemUnits = (item = {}, order = {}) => {
  const units = Array.isArray(item.serialUnits)
    ? item.serialUnits
        .map((unit) => ({
          serialNumber: String(unit?.serialNumber || '').trim(),
          qrCode: String(unit?.qrCode || '').trim(),
          branch: String(unit?.branch || '').trim(),
          status: String(unit?.status || '').trim(),
          productSku: String(unit?.productSku || '').trim(),
        }))
        .filter((unit) => unit.serialNumber || unit.qrCode)
    : [];

  if (units.length > 0) return units;

  if (Array.isArray(item.serialNumbers) && item.serialNumbers.length > 0) {
    return item.serialNumbers.map((serial, index) => ({
      serialNumber: String(serial || '').trim(),
      qrCode: buildOrderUnitQrPayload(order, item, index + 1),
      branch: String(item.sourceBranch || '').trim(),
      status: '',
      productSku: '',
      isOrderUnitFallback: true,
    }));
  }

  const quantity = Math.max(1, Number(item.quantity || 1));
  return Array.from({ length: quantity }, (_unused, index) => ({
    serialNumber: '',
    qrCode: buildOrderUnitQrPayload(order, item, index + 1),
    branch: String(item.sourceBranch || order.stockSourceBranch || order.customerBranch || '').trim(),
    status: 'pending inventory serial',
    productSku: String(item.sku || item.model || '').trim(),
    isOrderUnitFallback: true,
  }));
};

const formatDeliveryAddress = (address = {}) =>
  [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.region,
    address.postalCode,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');

const formatDateTime = (value) => {
  if (!value) return 'Not submitted';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const formatHorsepower = (item = {}) => {
  const parsed = Number(item.horsepower || String(item.specs || '').match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
  return parsed > 0 ? `${parsed} HP` : 'Not specified';
};

const refundStatusLabel = (status = '') => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'Refund completed';
  if (normalized === 'reviewed') return 'Refund reviewed';
  if (normalized === 'needs_review') return 'Refund review pending';
  return 'Refund review pending';
};

const getTechnicianName = (technician = {}) =>
  technician.name ||
  [technician.name_first, technician.name_last].filter(Boolean).join(' ').trim() ||
  technician.email ||
  'Technician';

const dateInputValue = (value = '') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const getDeliveryStatus = (order = {}) => {
  if (order.deliveryStatus) return String(order.deliveryStatus);
  if (order.workflowStatus === 'complete') return 'Completed';
  if (order.workflowStatus === 'to_install') return 'Delivered / installation pending';
  if (order.workflowStatus === 'to_deliver') return 'Preparing for dispatch';
  if (order.workflowStatus === 'to_pay') return 'Awaiting payment';
  return order.workflowLabel || 'Not recorded';
};

const getInstallationStatus = (order = {}, task = null) => {
  if (task?.status) return String(task.status).replace(/-/g, ' ');
  if (order.workflowStatus === 'complete') return 'Completed';
  if (order.workflowStatus === 'to_install') return 'Awaiting technician';
  return 'Not started';
};

const AdminOrders = ({ embedded = false }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [fulfillmentForms, setFulfillmentForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [orderViewFilter, setOrderViewFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const orderLoadInFlightRef = useRef(false);

  const loadOrders = useCallback(async (options = {}) => {
    const background = Boolean(options?.background);
    if (orderLoadInFlightRef.current) return;
    orderLoadInFlightRef.current = true;
    setError('');
    setLoading(true);
    try {
      const [ordersResponse, tasksResponse] = await Promise.all([
        apiRequest('/orders', { silentConnection: background }),
        apiRequest('/tasks?limit=75', { silentConnection: background }).catch(() => ({ tasks: [] })),
      ]);
      const response = ordersResponse;
      setOrders(response.orders || []);
      setTasks(tasksResponse.tasks || []);
      setLastSyncedAt(new Date());
      apiRequest('/users?role=technician', { silentConnection: true })
        .then((usersResponse) => setTechnicians(usersResponse.users || []))
        .catch(() => setTechnicians([]));
    } catch (e) {
      setError(e.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      orderLoadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadOrders({ background: true });
    };
    const refreshId = window.setInterval(refreshWhenVisible, 60000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(refreshId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadOrders]);

  const pendingOrders = useMemo(() => {
    if (orderViewFilter === 'refund_review') {
      return orders.filter((order) => order.refundReview?.required && order.refundReview.status !== 'completed');
    }
    if (orderViewFilter === 'cancel_requests') {
      return orders.filter((order) => order.cancellationRequest?.requested);
    }
    return orders;
  }, [orders, orderViewFilter]);
  const refundReviewCount = useMemo(
    () => orders.filter((order) => order.refundReview?.required && order.refundReview.status !== 'completed').length,
    [orders],
  );
  const cancelRequestCount = useMemo(
    () => orders.filter((order) => order.cancellationRequest?.requested).length,
    [orders],
  );
  const totalOrderPages = Math.max(1, Math.ceil(pendingOrders.length / ORDER_PAGE_SIZE));
  const paginatedOrders = useMemo(
    () => pendingOrders.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE),
    [orderPage, pendingOrders],
  );

  useEffect(() => {
    setOrderPage(1);
  }, [orderViewFilter]);

  useEffect(() => {
    if (orderPage > totalOrderPages) setOrderPage(totalOrderPages);
  }, [orderPage, totalOrderPages]);

  const tasksByOrder = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      const keys = [task.orderId, task.orderCode].map((value) => String(value || '').trim()).filter(Boolean);
      keys.forEach((key) => {
        map[key] = task;
      });
    });
    return map;
  }, [tasks]);

  const getSavedTechnicianId = (order) => {
    const linkedTask = tasksByOrder[String(order.id || '').trim()] || tasksByOrder[String(order.orderCode || '').trim()];
    if (linkedTask?.assignedTechnicianId) return String(linkedTask.assignedTechnicianId);
    const savedName = String(order.assignedTechnician || '').trim().toLowerCase();
    return String(technicians.find((technician) => getTechnicianName(technician).toLowerCase() === savedName)?.id || '');
  };

  const updateFulfillmentForm = (order, patch) => {
    const key = String(order.id || order.orderCode || '');
    setFulfillmentForms((current) => ({
      ...current,
      [key]: {
        assignedTechnicianId: getSavedTechnicianId(order),
        estimatedArrival: dateInputValue(order.estimatedArrival || order.estimatedDelivery),
        installationDate: dateInputValue(order.installationDate),
        timeSlot: '',
        cancellationReason: '',
        ...(current[key] || {}),
        ...patch,
      },
    }));
  };

  const getFulfillmentForm = (order) => {
    const key = String(order.id || order.orderCode || '');
    return fulfillmentForms[key] || {
      assignedTechnicianId: getSavedTechnicianId(order),
      estimatedArrival: dateInputValue(order.estimatedArrival || order.estimatedDelivery),
      installationDate: dateInputValue(order.installationDate),
      timeSlot: '',
      cancellationReason: '',
    };
  };

  const getOrderTechnicians = (order) => {
    const branch = String(order.stockSourceBranch || order.customerBranch || '').trim();
    if (!branch) return technicians;
    const matching = technicians.filter((technician) =>
      [technician.assignedBranch, technician.activeBranch]
        .map((value) => String(value || '').trim())
        .includes(branch) ||
      (!technician.assignedBranch && !technician.activeBranch),
    );
    return matching.length ? matching : technicians;
  };

  const handleProcess = async (order, actionOverride = '') => {
    const config = actionOverride
      ? { action: actionOverride }
      : statusActionMap[order.workflowStatus];
    if (!config) return;
    const processingKey = `${order.id}:${config.action}`;
    const form = getFulfillmentForm(order);
    if (config.action === 'dispatch' && !form.assignedTechnicianId) {
      alert('Select a technician before marking this order dispatched. Dispatch creates the assigned technician work order.');
      return;
    }
    if (['approve', 'dispatch'].includes(config.action) && (isPastCalendarDate(form.estimatedArrival) || isPastCalendarDate(form.installationDate))) {
      alert('Delivery and installation dates must be today or a future date.');
      return;
    }
    const technician = technicians.find((item) => String(item.id) === String(form.assignedTechnicianId));
    if (config.action === 'cancel' && !form.cancellationReason.trim()) {
      const ok = window.confirm('Cancel this order without a cancellation note?');
      if (!ok) return;
    }
    setProcessingId(processingKey);
    try {
      await apiRequest(`/orders/${order.id}/process`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: config.action,
          assignedTechnicianId: form.assignedTechnicianId,
          assignedTechnicianName: technician ? getTechnicianName(technician) : '',
          estimatedArrival: form.estimatedArrival,
          installationDate: form.installationDate,
          timeSlot: form.timeSlot,
          cancellationReason: form.cancellationReason,
        })
      });
      appendAuditLog({
        user: user?.email || user?.name || 'admin',
        action: 'change_order_status',
        details: `Order ${order.orderCode || order.id}: ${order.workflowStatus} -> ${config.action}`,
      });
      await loadOrders();
    } catch (e) {
      alert(e.message || 'Unable to process order.');
    } finally {
      setProcessingId('');
    }
  };

  const handleVerifyPaymongo = async (order) => {
    if (!order?.id) return;
    const processingKey = `${order.id}:verify-paymongo`;
    setProcessingId(processingKey);
    try {
      await apiRequest(`/orders/${order.id}/paymongo/verify`, {
        method: 'POST',
      });
      await loadOrders();
    } catch (e) {
      alert(e.message || 'Unable to verify PayMongo payment.');
    } finally {
      setProcessingId('');
    }
  };

  const handleRecovery = async (order, action) => {
    if (!order?.id) return;
    const actionLabels = {
      assign_technician: 'assign and sync the technician work order',
      recreate_task: 'repair the technician task',
      sync_installed_units: 'sync installed customer units',
    };
    const label = actionLabels[action] || 'run recovery';
    const ok = window.confirm(`Run ${label} for ${order.orderCode || order.id}?`);
    if (!ok) return;

    const processingKey = `${order.id}:recovery-${action}`;
    const form = getFulfillmentForm(order);
    if (['assign_technician', 'recreate_task'].includes(action) && (isPastCalendarDate(form.estimatedArrival) || isPastCalendarDate(form.installationDate))) {
      alert('Delivery and installation dates must be today or a future date.');
      return;
    }
    const technician = technicians.find((item) => String(item.id) === String(form.assignedTechnicianId));
    setProcessingId(processingKey);
    try {
      const result = await apiRequest(`/orders/${order.id}/recovery`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          assignedTechnicianId: form.assignedTechnicianId,
          assignedTechnicianName: technician ? getTechnicianName(technician) : '',
          estimatedArrival: form.estimatedArrival,
          installationDate: form.installationDate,
          timeSlot: form.timeSlot,
        }),
      });
      alert(result.message || 'Recovery action completed.');
      await loadOrders();
    } catch (e) {
      alert(e.message || 'Unable to run order recovery.');
    } finally {
      setProcessingId('');
    }
  };

  const handleAssignment = async (order) => {
    const form = getFulfillmentForm(order);
    if (!form.assignedTechnicianId) {
      alert('Select a technician before saving this assignment.');
      return;
    }
    await handleRecovery(order, 'assign_technician');
  };

  const handleRefundReview = async (order, status) => {
    if (!order?.id) return;
    const processingKey = `${order.id}:refund-${status}`;
    const label = refundStatusLabel(status).toLowerCase();
    const ok = window.confirm(`Mark ${order.orderCode || order.id} as ${label}?`);
    if (!ok) return;

    setProcessingId(processingKey);
    try {
      await apiRequest(`/orders/${order.id}/refund-review`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      appendAuditLog({
        user: user?.email || user?.name || 'admin',
        action: 'refund_review',
        details: `Order ${order.orderCode || order.id}: ${label}`,
      });
      await loadOrders();
    } catch (e) {
      alert(e.message || 'Unable to update refund review.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <AdminLayout title="Customer Orders" subtitle="Review and process customer checkout requests" embedded={embedded}>
      <div className="admin-orders-page">
        {loading ? <p>Loading orders...</p> : null}
        {error ? <p className="admin-orders-error">{error}</p> : null}
        {!loading ? (
          <div className="admin-orders-filterbar">
            <button type="button" onClick={loadOrders} className="admin-orders-refresh">
              Refresh{lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString()}` : ''}
            </button>
            <button
              type="button"
              className={orderViewFilter === 'all' ? 'active' : ''}
              onClick={() => setOrderViewFilter('all')}
            >
              All Orders <span>{orders.length}</span>
            </button>
            <button
              type="button"
              className={orderViewFilter === 'refund_review' ? 'active' : ''}
              onClick={() => setOrderViewFilter('refund_review')}
            >
              Refund Review <span>{refundReviewCount}</span>
            </button>
            <button
              type="button"
              className={orderViewFilter === 'cancel_requests' ? 'active' : ''}
              onClick={() => setOrderViewFilter('cancel_requests')}
            >
              Cancel Requests <span>{cancelRequestCount}</span>
            </button>
          </div>
        ) : null}
        {!loading && pendingOrders.length === 0 ? <p>No customer orders.</p> : null}
        <div className="admin-orders-list">
          {paginatedOrders.map((order) => {
            const actionConfig = statusActionMap[order.workflowStatus];
            const canCancel = ['to_pay', 'to_deliver'].includes(order.workflowStatus);
            const isPaymongoPending =
              String(order.paymentProvider || '').toLowerCase() === 'paymongo' &&
              String(order.paymentStatus || '').toLowerCase() !== 'paid' &&
              order.workflowStatus === 'to_pay';
            const linkedTask = tasksByOrder[String(order.id || '').trim()] || tasksByOrder[String(order.orderCode || '').trim()];
            const proof = linkedTask?.proof || null;
            const ampRecords = Object.values(linkedTask?.ampRegistrations || {})
              .filter((registration) => registration?.status === 'registered');
            const hasInstallationPhoto = (proof?.afterPhotos || []).some((photo) => photo?.uri);
            const hasCustomerSignoff = Boolean(proof?.customerSignature?.name || linkedTask?.customerSignatureName);
            const hasTechnicianSummary = Boolean(linkedTask?.findings || linkedTask?.resolution);
            const taskCompleted = String(linkedTask?.status || '').toLowerCase() === 'completed';
            const registrationComplete = Boolean(linkedTask?.registrationProgress?.isComplete);
            const hasProof = taskCompleted && registrationComplete && hasInstallationPhoto && hasCustomerSignoff && hasTechnicianSummary;
            const hasAnyInstallationEvidence = Boolean(proof?.submittedAt || hasInstallationPhoto || hasCustomerSignoff || ampRecords.length);
            const isWaitingTechnician =
              order.workflowStatus === 'to_install' &&
              actionConfig?.action === 'complete' &&
              (!taskCompleted || !hasProof);
            const canRepairTask = ['to_deliver', 'to_install', 'complete'].includes(order.workflowStatus);
            const canSyncInstalledUnits = taskCompleted || order.workflowStatus === 'complete';
            const paymentStatus = order.paymentStatus || (order.workflowStatus === 'to_pay' ? 'pending' : 'not recorded');
            const deliveryStatus = getDeliveryStatus(order);
            const installationStatus = getInstallationStatus(order, linkedTask);
            return (
              <article key={order.id} className="admin-order-card">
                <div className="admin-order-row">
                  <h3>{order.orderCode}</h3>
                  <span className={`admin-order-status status-${order.workflowStatus}`}>{order.workflowLabel}</span>
                </div>
                <p className="admin-order-meta">
                  Customer: {order.customerName || 'N/A'} | Branch: {order.customerBranch || order.stockSourceBranch || 'N/A'}
                </p>
                <p className="admin-order-meta">
                  Delivery: {formatDeliveryAddress(order.address) || 'No delivery address'}
                </p>
                {order.address?.phone ? (
                  <p className="admin-order-meta">Contact: {order.address.phone}</p>
                ) : null}
                <p className="admin-order-meta">
                  Amount: PHP {Number(order.totalAmount || 0).toLocaleString()} | Payment: {order.paymentMethod || 'N/A'}
                  {order.paymentProvider === 'paymongo' ? ` | PayMongo: ${order.paymentStatus || 'pending'}` : ''}
                </p>
                <div className="admin-order-workflow-summary" aria-label="Order service workflow">
                  <span><b>Payment</b>{paymentStatus}</span>
                  <span><b>Delivery</b>{deliveryStatus}</span>
                  <span><b>Technician</b>{order.assignedTechnician || linkedTask?.assignedTechnicianName || 'Unassigned'}</span>
                  <span><b>Installation / service</b>{installationStatus}</span>
                </div>
                {(order.assignedTechnician || linkedTask?.assignedTechnicianName || order.estimatedArrival || order.installationDate) ? (
                  <p className="admin-order-meta">
                    Fulfillment: {order.assignedTechnician || linkedTask?.assignedTechnicianName || 'Unassigned'}
                    {order.estimatedArrival ? ` | Delivery ${dateInputValue(order.estimatedArrival)}` : ''}
                    {order.installationDate ? ` | Install ${dateInputValue(order.installationDate)}` : ''}
                  </p>
                ) : null}
                {order.refundReview?.required ? (
                  <div className={`admin-order-refund-note refund-${order.refundReview.status || 'needs_review'}`}>
                    <strong>{refundStatusLabel(order.refundReview.status)}</strong>
                    <span>{order.refundReview.reason || 'Manual PayMongo refund review required.'}</span>
                    {order.refundReview.reviewedAt ? (
                      <small>Reviewed by {order.refundReview.reviewedByName || 'Admin'} on {formatDateTime(order.refundReview.reviewedAt)}</small>
                    ) : null}
                    {order.refundReview.completedAt ? (
                      <small>Completed by {order.refundReview.completedByName || 'Admin'} on {formatDateTime(order.refundReview.completedAt)}</small>
                    ) : null}
                  </div>
                ) : null}
                {order.cancellationRequest?.requested ? (
                  <div className={`admin-order-cancel-request request-${order.cancellationRequest.status || 'requested'}`}>
                    <strong>
                      {order.cancellationRequest.status === 'approved'
                        ? 'Cancellation approved'
                        : 'Cancellation requested'}
                    </strong>
                    <span>{order.cancellationRequest.reason || order.cancellationReason || 'Customer requested cancellation.'}</span>
                    <small>
                      Requested by {order.cancellationRequest.requestedByName || order.customerName || 'Customer'}
                      {order.cancellationRequest.requestedAt ? ` on ${formatDateTime(order.cancellationRequest.requestedAt)}` : ''}
                    </small>
                  </div>
                ) : null}
                {['to_pay', 'to_deliver', 'to_install'].includes(order.workflowStatus) ? (
                  <div className="admin-order-fulfillment">
                    <label>
                      Technician
                      <select
                        value={getFulfillmentForm(order).assignedTechnicianId}
                        onChange={(event) => updateFulfillmentForm(order, { assignedTechnicianId: event.target.value })}
                      >
                        <option value="">Auto / unassigned</option>
                        {getOrderTechnicians(order).map((technician) => (
                          <option key={technician.id} value={technician.id}>
                            {getTechnicianName(technician)}
                            {technician.assignedBranch ? ` - ${technician.assignedBranch}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Delivery Date
                      <input
                        type="date"
                        min={getTodayDateInput()}
                        value={getFulfillmentForm(order).estimatedArrival}
                        onChange={(event) => updateFulfillmentForm(order, { estimatedArrival: event.target.value })}
                      />
                    </label>
                    <label>
                      Install Date
                      <input
                        type="date"
                        min={getTodayDateInput()}
                        value={getFulfillmentForm(order).installationDate}
                        onChange={(event) => updateFulfillmentForm(order, { installationDate: event.target.value })}
                      />
                    </label>
                    <label>
                      Time Slot
                      <select
                        value={getFulfillmentForm(order).timeSlot}
                        onChange={(event) => updateFulfillmentForm(order, { timeSlot: event.target.value })}
                      >
                        <option value="">Select time slot</option>
                        {TIME_SLOT_OPTIONS.map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="admin-process-btn admin-assign-technician-btn"
                      onClick={() => handleAssignment(order)}
                      disabled={!getFulfillmentForm(order).assignedTechnicianId || processingId === `${order.id}:recovery-assign_technician`}
                    >
                      {processingId === `${order.id}:recovery-assign_technician`
                        ? 'Assigning...'
                        : linkedTask?.assignedTechnicianId
                          ? 'Update Technician & Work Order'
                          : 'Assign Technician & Create Work Order'}
                    </button>
                  </div>
                ) : null}
                <div className="admin-order-items">
                  {(order.items || []).map((item, idx) => {
                    const units = getOrderItemUnits(item, order);

                    return (
                      <div className="admin-order-item" key={`${order.id}-${idx}`}>
                        <div className="admin-order-item-summary">
                          <strong>{item.name}</strong>
                          <span>x{item.quantity}</span>
                        </div>
                        <div className="admin-order-item-horsepower">Horsepower: {formatHorsepower(item)}</div>

                        {units.length > 0 ? (
                          <div className="admin-order-unit-grid">
                            {units.map((unit, serialIdx) => {
                              const qrValue = getInventoryQrValue(unit.serialNumber, unit.qrCode);
                              const qrPayload = getInventoryQrPayload(unit.serialNumber, unit.qrCode);
                              const unitKey = unit.serialNumber || unit.qrCode;

                              return (
                                <div
                                  className="admin-order-unit-card"
                                  key={`${order.id}-${idx}-${unitKey}-${serialIdx}`}
                                >
                                  <div className="admin-order-unit-qr" aria-label={`QR code for serial number ${unit.serialNumber || serialIdx + 1}`}>
                                    {qrValue ? (
                                      <QRCodeCanvas
                                        value={qrValue}
                                        size={96}
                                        level="M"
                                        includeMargin
                                      />
                                    ) : (
                                      <span>No QR</span>
                                    )}
                                  </div>
                                  <div className="admin-order-unit-details">
                                    <span>Inventory QR - Unit {serialIdx + 1}</span>
                                    <code>{unit.serialNumber || `Order unit ${serialIdx + 1}`}</code>
                                    {unit.productSku ? <small>SKU: {unit.productSku}</small> : null}
                                    {unit.branch ? <small>Branch: {unit.branch}</small> : null}
                                    {unit.status ? <small>Status: {unit.status}</small> : null}
                                    {qrPayload ? <small>Payload: {qrPayload}</small> : null}
                                    {unit.isOrderUnitFallback ? <small>Order-unit QR shown until serial syncs</small> : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="admin-order-no-serials">No serial numbers assigned yet.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasAnyInstallationEvidence ? (
                  <div className="admin-order-proof">
                    <strong>Proof of Installation</strong>
                    <span>Technician: {proof.technicianName || linkedTask.assignedTechnicianName || 'Technician'}</span>
                    <span>Customer Sign-off: {proof.customerSignature?.name || linkedTask.customerSignatureName || 'No sign-off yet'}</span>
                    <span>Submitted: {formatDateTime(proof.submittedAt || linkedTask.proofSubmittedAt)}</span>
                    {linkedTask?.findings ? <span>Work completed: {linkedTask.findings}</span> : null}
                    {linkedTask?.afterCondition ? <span>Final condition: {linkedTask.afterCondition}</span> : null}
                    {ampRecords.length ? (
                      <div className="admin-order-amp-records">
                        <strong>AMP registration record</strong>
                        {ampRecords.map((registration) => (
                          <div className="admin-order-amp-record" key={registration.serialNumber}>
                            <b>{registration.serialNumber}</b>
                            <span>
                              {registration.ampParameters?.placementArea || 'Placement not recorded'} · Filter: {registration.ampParameters?.filterCondition || 'normal'} · Coil: {registration.ampParameters?.coilCondition || 'normal'} · Condition: {registration.ampParameters?.conditionRating || 'good'}
                            </span>
                            {registration.ampParameters?.notes ? <small>{registration.ampParameters.notes}</small> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="admin-order-proof-photos">
                      {(proof.beforePhotos || []).slice(0, 1).map((photo, index) => (
                        <a key={`before-${index}`} href={photo.uri} target="_blank" rel="noreferrer">
                          <img src={photo.uri} alt={photo.label || 'Before service'} />
                          <span>{photo.label || 'Before'}</span>
                        </a>
                      ))}
                      {(proof.afterPhotos || []).slice(0, 1).map((photo, index) => (
                        <a key={`after-${index}`} href={photo.uri} target="_blank" rel="noreferrer">
                          <img src={photo.uri} alt={photo.label || 'After service'} />
                          <span>{photo.label || 'After'}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                {isWaitingTechnician ? (
                  <p className="admin-order-recovery-note">
                    Waiting for the technician to finish AMP registration, submit an installed-unit photo, work summary, and receiver sign-off.
                  </p>
                ) : null}
                {actionConfig || order.receipt?.receiptNumber || order.refundReview?.required || canRepairTask ? (
                  <div className="admin-order-actions">
                    {actionConfig ? (
                      <>
                        <button
                          type="button"
                          className="admin-process-btn"
                          onClick={() => handleProcess(order)}
                          disabled={isPaymongoPending || isWaitingTechnician || (actionConfig.action === 'dispatch' && !getFulfillmentForm(order).assignedTechnicianId) || processingId === `${order.id}:${actionConfig.action}`}
                        >
                          {isPaymongoPending
                            ? 'Waiting PayMongo'
                            : isWaitingTechnician
                              ? 'Waiting Technician'
                              : processingId === `${order.id}:${actionConfig.action}`
                                ? 'Processing...'
                                : actionConfig.label}
                        </button>
                        {canCancel ? (
                          <>
                            <input
                              className="admin-cancel-reason"
                              type="text"
                              placeholder="Cancellation note"
                              value={getFulfillmentForm(order).cancellationReason}
                              onChange={(event) => updateFulfillmentForm(order, { cancellationReason: event.target.value })}
                            />
                            <button
                              type="button"
                              className="admin-cancel-btn"
                              onClick={() => handleProcess(order, 'cancel')}
                              disabled={processingId === `${order.id}:cancel`}
                            >
                              {processingId === `${order.id}:cancel` ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                          </>
                        ) : null}
                        {isPaymongoPending ? (
                          <button
                            type="button"
                            className="admin-process-btn"
                            onClick={() => handleVerifyPaymongo(order)}
                            disabled={processingId === `${order.id}:verify-paymongo`}
                          >
                            {processingId === `${order.id}:verify-paymongo` ? 'Verifying...' : 'Verify PayMongo'}
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {canRepairTask ? (
                      <button
                        type="button"
                        className="admin-recovery-btn"
                        onClick={() => handleRecovery(order, 'recreate_task')}
                        disabled={processingId === `${order.id}:recovery-recreate_task`}
                      >
                        {processingId === `${order.id}:recovery-recreate_task` ? 'Repairing...' : 'Repair Task'}
                      </button>
                    ) : null}
                    {canSyncInstalledUnits ? (
                      <button
                        type="button"
                        className="admin-recovery-sync-btn"
                        onClick={() => handleRecovery(order, 'sync_installed_units')}
                        disabled={processingId === `${order.id}:recovery-sync_installed_units`}
                      >
                        {processingId === `${order.id}:recovery-sync_installed_units` ? 'Syncing...' : 'Sync Units'}
                      </button>
                    ) : null}
                    {order.refundReview?.required && order.refundReview.status !== 'completed' ? (
                      <>
                        {order.refundReview.status !== 'reviewed' ? (
                          <button
                            type="button"
                            className="admin-refund-btn"
                            onClick={() => handleRefundReview(order, 'reviewed')}
                            disabled={processingId === `${order.id}:refund-reviewed`}
                          >
                            {processingId === `${order.id}:refund-reviewed` ? 'Saving...' : 'Mark Refund Reviewed'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="admin-refund-complete-btn"
                          onClick={() => handleRefundReview(order, 'completed')}
                          disabled={processingId === `${order.id}:refund-completed`}
                        >
                          {processingId === `${order.id}:refund-completed` ? 'Saving...' : 'Refund Completed'}
                        </button>
                      </>
                    ) : null}
                    {order.receipt?.receiptNumber ? (
                      <button
                        type="button"
                        className="admin-receipt-btn"
                        onClick={() => navigate(`/receipt/${order.id}`)}
                      >
                        View Receipt
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {!loading && pendingOrders.length > 0 ? (
          <div className="admin-orders-pagination" aria-label="Orders pagination">
            <span>
              Showing {(orderPage - 1) * ORDER_PAGE_SIZE + 1}-{Math.min(orderPage * ORDER_PAGE_SIZE, pendingOrders.length)} of {pendingOrders.length}
            </span>
            <div>
              <button type="button" onClick={() => setOrderPage((page) => Math.max(1, page - 1))} disabled={orderPage === 1}>
                Previous
              </button>
              <span>Page {orderPage} of {totalOrderPages}</span>
              <button type="button" onClick={() => setOrderPage((page) => Math.min(totalOrderPages, page + 1))} disabled={orderPage === totalOrderPages}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
