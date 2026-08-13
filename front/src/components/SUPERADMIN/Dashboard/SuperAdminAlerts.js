import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { apiRequest } from '../../../config/api';
import '../superAdminShared.css';
import './SuperAdminAlerts.css';

const buildSeverity = (notification) => {
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
const getPurchaseBranch = (order) => order?.stockSourceBranch || order?.customerBranch || 'Not linked to an order';

const SuperAdminAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [notificationResult, orderResult] = await Promise.all([
        apiRequest('/notifications/me'),
        apiRequest('/orders'),
      ]);
      setAlerts(Array.isArray(notificationResult.notifications) ? notificationResult.notifications : []);
      setOrders(Array.isArray(orderResult.orders) ? orderResult.orders : []);
    } catch (requestError) {
      setAlerts([]);
      setOrders([]);
      setError(requestError.message || 'Unable to load customer support alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const detailedAlerts = useMemo(() => {
    const byId = new Map(orders.map((order) => [String(order.id), order]));
    const byCode = new Map(orders.map((order) => [String(order.orderCode || '').toUpperCase(), order]));
    return alerts
      .filter((alert) => alert.type === 'order' || /complaint|refund|cancel|customer concern/i.test(`${alert.title || ''} ${alert.message || ''}`))
      .map((alert) => {
        const order = byId.get(String(alert.targetId || '')) || byCode.get(getOrderCodeFromAlert(alert).toUpperCase()) || null;
        return {
          ...alert,
          order,
          branch: getPurchaseBranch(order),
          severity: buildSeverity(alert),
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [alerts, orders]);

  const branches = useMemo(() => Array.from(new Set(detailedAlerts.map((alert) => alert.branch).filter((branch) => branch && branch !== 'Not linked to an order'))).sort(), [detailedAlerts]);
  const visibleAlerts = useMemo(() => detailedAlerts.filter((alert) => (branchFilter === 'all' || alert.branch === branchFilter) && (severityFilter === 'all' || alert.severity === severityFilter)), [branchFilter, detailedAlerts, severityFilter]);

  return (
    <SuperAdminLayout title="Customer Support Alerts" subtitle="Customer orders, concerns, cancellations, and refund follow-up with purchase context">
      <section className="alert-summary-grid">
        <div><strong>{detailedAlerts.length}</strong><span>Support alerts</span></div>
        <div><strong>{detailedAlerts.filter((alert) => alert.severity === 'high').length}</strong><span>High priority</span></div>
        <div><strong>{new Set(detailedAlerts.map((alert) => alert.branch).filter((branch) => branch !== 'Not linked to an order')).size}</strong><span>Purchase branches involved</span></div>
        <button type="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </section>
      <section className="alert-workspace">
        <div className="alert-heading"><div><p className="alert-eyebrow">Executive inbox</p><h2>Customer support &amp; order alerts</h2><p>Each order alert includes the branch where stock was allocated for the purchase.</p></div></div>
        <div className="alert-filters">
          <label>Purchase branch<select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">All purchase branches</option>{branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
          <label>Priority<select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select></label>
          <button type="button" className="alert-reset" onClick={() => { setBranchFilter('all'); setSeverityFilter('all'); }} disabled={branchFilter === 'all' && severityFilter === 'all'}>Clear filters</button>
        </div>
        {loading ? <div className="alert-empty">Loading customer support alerts…</div> : null}
        {error ? <div className="alert-error">{error}</div> : null}
        {!loading && !error && visibleAlerts.length === 0 ? <div className="alert-empty">No customer support alerts match these filters.</div> : null}
        <div className="alert-list">
          {visibleAlerts.map((alert) => {
            const order = alert.order;
            const itemSummary = order?.items?.map((item) => `${item.name} ×${item.quantity}`).join(', ') || 'Order details are not available for this legacy alert.';
            return <article key={alert.id} className="alert-card">
              <div className="alert-card-top"><div><p className="alert-reference">{order?.orderCode || alert.id}</p><h3>{alert.title || 'Customer support alert'}</h3></div><span className={`alert-severity alert-severity--${alert.severity}`}>{alert.severity} priority</span></div>
              <p className="alert-concern">{alert.message || 'No message provided.'}</p>
              <dl className="alert-detail-grid">
                <div><dt>Customer</dt><dd>{order?.customerName || 'Not linked to a customer order'}</dd></div>
                <div><dt>Purchase branch</dt><dd>{alert.branch}</dd></div>
                <div><dt>Customer location branch</dt><dd>{order?.customerBranch || 'Not recorded'}</dd></div>
                <div><dt>Payment</dt><dd>{order ? `${order.paymentMethod || 'Not recorded'} · ${order.paymentStatus || 'pending'}` : 'Not linked to an order'}</dd></div>
                <div className="alert-detail-grid-wide"><dt>Items</dt><dd>{itemSummary}</dd></div>
                <div><dt>Received</dt><dd>{formatDate(alert.createdAt)}</dd></div>
              </dl>
              {order ? <button type="button" className="alert-open-order" onClick={() => navigate('/superadmin/orders')}>Open customer order</button> : null}
            </article>;
          })}
        </div>
      </section>
    </SuperAdminLayout>
  );
};

export default SuperAdminAlerts;
