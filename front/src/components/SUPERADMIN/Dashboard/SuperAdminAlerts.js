import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { alertCategory, operationalAlertRoute } from '../../../domain/operationalAlerts';
import { apiRequest } from '../../../config/api';
import '../superAdminShared.css';
import './SuperAdminAlerts.css';

const buildSeverity = (notification) => {
  if (notification.severity === 'critical') return 'high';
  if (notification.severity === 'warning') return 'medium';
  const text = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();
  if (text.includes('urgent') || text.includes('critical') || text.includes('refund') || text.includes('cancel')) return 'high';
  if (notification.type === 'order') return 'medium';
  return 'low';
};

const getOrderCodeFromAlert = (alert = {}) => {
  const match = `${alert.title || ''} ${alert.message || ''}`.match(/\b(ORD[-A-Z0-9_]+)/i);
  return match?.[1] || '';
};

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not recorded';
const getPurchaseBranch = (order) => order?.stockSourceBranch || order?.customerBranch || 'Not recorded';
const paymentSummary = (order = {}) => {
  const method = String(order.paymentMethod || '').trim().toLowerCase();
  const status = String(order.paymentStatus || '').trim().toLowerCase();
  const methodLabel = method === 'cod' ? 'Cash on Delivery' : method === 'gcash' ? 'GCash' : method === 'card' || method === 'credit' ? 'Card' : method ? method.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Payment method not recorded';
  if (method === 'cod') {
    if (order.workflowStatus === 'cancelled') return `${methodLabel} · Cancelled before payment`;
    return `${methodLabel} · ${order.workflowStatus === 'complete' ? 'Paid on delivery' : 'Payment due on delivery'}`;
  }
  const statusLabel = status === 'paid' || status === 'completed' || status === 'succeeded'
    ? 'Paid'
    : status === 'failed' ? 'Payment failed'
      : status === 'refunded' ? 'Refunded'
        : status === 'cancelled' ? 'Payment cancelled'
          : 'Payment pending';
  return `${methodLabel} · ${statusLabel}`;
};

const SuperAdminAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [notificationResult, orderResult] = await Promise.all([
        apiRequest('/notifications/me'),
        apiRequest('/orders').catch(() => ({ orders: [] })),
      ]);
      setAlerts(Array.isArray(notificationResult.notifications) ? notificationResult.notifications : []);
      setOrders(Array.isArray(orderResult.orders) ? orderResult.orders : []);
    } catch (requestError) {
      setAlerts([]);
      setOrders([]);
      setError(requestError.message || 'Unable to load operational alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const detailedAlerts = useMemo(() => {
    const byId = new Map(orders.map((order) => [String(order.id), order]));
    const byCode = new Map(orders.map((order) => [String(order.orderCode || '').toUpperCase(), order]));
    return alerts
      .map((alert) => {
        const order = byId.get(String(alert.targetId || '')) || byCode.get(getOrderCodeFromAlert(alert).toUpperCase()) || null;
        return {
          ...alert,
          order,
          branch: alert.branch || (order ? getPurchaseBranch(order) : 'Not recorded'),
          alertCategory: alertCategory(alert),
          severity: buildSeverity(alert),
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [alerts, orders]);

  const branches = useMemo(() => Array.from(new Set(detailedAlerts.map((alert) => alert.branch).filter((branch) => branch && branch !== 'Not recorded'))).sort(), [detailedAlerts]);
  const visibleAlerts = useMemo(() => detailedAlerts.filter((alert) => (branchFilter === 'all' || alert.branch === branchFilter) && (severityFilter === 'all' || alert.severity === severityFilter) && (categoryFilter === 'all' || alert.alertCategory === categoryFilter)), [branchFilter, detailedAlerts, severityFilter, categoryFilter]);

  return (
    <SuperAdminLayout title="Operations Alerts" subtitle="Transactions, service requests, warranty claims, and maintenance across all branches">
      <section className="alert-summary-grid">
        <div><strong>{detailedAlerts.length}</strong><span>Operational alerts</span></div>
        <div><strong>{detailedAlerts.filter((alert) => alert.severity === 'high').length}</strong><span>High priority</span></div>
        <div><strong>{new Set(detailedAlerts.map((alert) => alert.branch).filter((branch) => branch !== 'Not recorded')).size}</strong><span>Branches involved</span></div>
        <button type="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </section>
      <section className="alert-workspace">
        <div className="alert-heading"><div><p className="alert-eyebrow">Executive inbox</p><h2>Transactions, requests &amp; maintenance</h2><p>Review each event and open the relevant order, service request, or technician work record.</p></div></div>
        <div className="alert-filters">
          <label>Branch<select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">All branches</option>{branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
          <label>Activity<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All activities</option><option value="transactions">Transactions</option><option value="requests">Requests &amp; warranty</option><option value="maintenance">Maintenance &amp; technician work</option><option value="other">Other alerts</option></select></label>
          <label>Priority<select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label>
          <button type="button" className="alert-reset" onClick={() => { setBranchFilter('all'); setSeverityFilter('all'); setCategoryFilter('all'); }} disabled={branchFilter === 'all' && severityFilter === 'all' && categoryFilter === 'all'}>Clear filters</button>
        </div>
        {loading ? <div className="alert-empty">Loading operational alerts…</div> : null}
        {error ? <div className="alert-error">{error}</div> : null}
        {!loading && !error && visibleAlerts.length === 0 ? <div className="alert-empty">No operational alerts match these filters.</div> : null}
        <div className="alert-list">
          {visibleAlerts.map((alert) => {
            const order = alert.order;
            const itemSummary = order?.items?.map((item) => `${item.name} ×${item.quantity}`).join(', ') || 'Order details are not available for this legacy alert.';
            return <article key={alert.id} className="alert-card">
              <div className="alert-card-top"><div><p className="alert-reference">{order?.orderCode || alert.id}</p><h3>{alert.title || 'Customer support alert'}</h3></div><span className={`alert-severity alert-severity--${alert.severity}`}>{alert.severity} priority</span></div>
              <p className="alert-concern">{alert.message || 'No message provided.'}</p>
              <dl className="alert-detail-grid">
                {order ? <><div><dt>Customer</dt><dd>{order?.customerName || 'Not linked to a customer order'}</dd></div>
                <div><dt>Purchase branch</dt><dd>{alert.branch}</dd></div>
                <div><dt>Customer location branch</dt><dd>{order?.customerBranch || 'Not recorded'}</dd></div>
                <div><dt>Payment</dt><dd>{order ? paymentSummary(order) : 'Not recorded'}</dd></div>
                <div className="alert-detail-grid-wide"><dt>Items</dt><dd>{itemSummary}</dd></div>
                </> : <><div><dt>Activity</dt><dd>{alert.alertCategory}</dd></div><div><dt>Branch</dt><dd>{alert.branch}</dd></div></>}
                <div><dt>Received</dt><dd>{formatDate(alert.createdAt)}</dd></div>
              </dl>
              <button type="button" className="alert-open-order" onClick={() => navigate(operationalAlertRoute(alert, "superadmin"))}>Open details</button>
            </article>;
          })}
        </div>
      </section>
    </SuperAdminLayout>
  );
};

export default SuperAdminAlerts;
