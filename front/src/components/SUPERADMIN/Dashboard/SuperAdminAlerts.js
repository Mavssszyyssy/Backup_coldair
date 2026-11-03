import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { alertCategory, operationalAlertRoute } from '../../../domain/operationalAlerts';
import { currentStockAlerts } from '../../../domain/stockAlerts';
import { apiRequest } from '../../../config/api';
import { subscribeToNotificationUpdates } from '../../../utils/notificationSync';
import { formatBusinessDateTime } from '../../../utils/dateTime';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
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

const formatDate = (value) => value ? formatBusinessDateTime(value) : 'Not recorded';
const CATEGORY_LABELS = { transactions: 'Transactions', requests: 'Requests & warranty', maintenance: 'Maintenance & technician work', stock: 'Stock alerts', other: 'Other alerts' };
const getPurchaseBranch = (order) => order?.stockSourceBranch || order?.customerBranch || 'Not recorded';
const paymentSummary = (order = {}, t = (value) => value) => {
  const method = String(order.paymentMethod || '').trim().toLowerCase();
  const status = String(order.paymentStatus || '').trim().toLowerCase();
  const methodLabel = t(method === 'cod' ? 'Cash on Delivery' : method === 'gcash' ? 'GCash' : method === 'card' || method === 'credit' ? 'Card' : method ? method.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Payment method not recorded');
  if (method === 'cod') {
    if (order.workflowStatus === 'cancelled') return `${methodLabel} · ${t('Cancelled before payment')}`;
    return `${methodLabel} · ${t(order.workflowStatus === 'complete' ? 'Paid on delivery' : 'Payment due on delivery')}`;
  }
  const statusLabel = status === 'paid' || status === 'completed' || status === 'succeeded'
    ? 'Paid'
    : status === 'failed' ? 'Payment failed'
      : status === 'refunded' ? 'Refunded'
        : status === 'cancelled' ? 'Payment cancelled'
          : 'Payment pending';
  return `${methodLabel} · ${t(statusLabel)}`;
};

const SuperAdminAlerts = () => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const loadInFlightRef = useRef(false);

  const load = useCallback(async ({ showLoading = false } = {}) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const [notificationResult, orderResult, productResult] = await Promise.all([
        apiRequest('/notifications/me'),
        apiRequest('/orders?view=compact&limit=200').catch(() => ({ orders: [] })),
        apiRequest('/products/stock-status'),
      ]);
      setAlerts(Array.isArray(notificationResult.notifications) ? notificationResult.notifications : []);
      setOrders(Array.isArray(orderResult.orders) ? orderResult.orders : []);
      setStockAlerts(currentStockAlerts(Array.isArray(productResult.products) ? productResult.products : []));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load operations alerts.');
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    load({ showLoading: true });
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    // Notification events trigger an immediate refresh. This slower fallback
    // poll keeps long-open tabs synchronized without downloading the same
    // unchanged alert context twelve times per minute.
    const pollId = window.setInterval(refreshWhenVisible, 15000);
    const unsubscribe = subscribeToNotificationUpdates(() => load());
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearInterval(pollId);
      unsubscribe();
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [load]);

  const detailedAlerts = useMemo(() => {
    const byId = new Map(orders.map((order) => [String(order.id), order]));
    const byCode = new Map(orders.map((order) => [String(order.orderCode || '').toUpperCase(), order]));
    return [...alerts.filter((alert) => alertCategory(alert) !== 'stock'), ...stockAlerts]
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
  }, [alerts, orders, stockAlerts]);

  const branches = useMemo(() => Array.from(new Set(detailedAlerts.map((alert) => alert.branch).filter((branch) => branch && branch !== 'Not recorded'))).sort(), [detailedAlerts]);
  const visibleAlerts = useMemo(() => detailedAlerts.filter((alert) => (branchFilter === 'all' || alert.branch === branchFilter) && (severityFilter === 'all' || alert.severity === severityFilter) && (categoryFilter === 'all' || alert.alertCategory === categoryFilter)), [branchFilter, detailedAlerts, severityFilter, categoryFilter]);

  return (
    <SuperAdminLayout title={t('Operations Alerts')} subtitle={t('Transactions, service requests, warranty claims, and maintenance across all branches')}>
      <section className="alert-summary-grid">
        <div><strong>{detailedAlerts.length}</strong><span>{t('Operations alerts')}</span></div>
        <div><strong>{detailedAlerts.filter((alert) => alert.severity === 'high').length}</strong><span>{t('High priority')}</span></div>
        <div><strong>{new Set(detailedAlerts.map((alert) => alert.branch).filter((branch) => branch !== 'Not recorded')).size}</strong><span>{t('Branches involved')}</span></div>
        <button type="button" onClick={() => load({ showLoading: true })} disabled={loading}>{t(loading ? 'Refreshing…' : 'Refresh')}</button>
      </section>
      <section className="alert-workspace">
        <div className="alert-heading"><div><p className="alert-eyebrow">{t('Executive inbox')}</p><h2>{t('Transactions, requests, maintenance & stock')}</h2><p>{t('Review events and current inventory shortages across branches.')}</p></div></div>
        <div className="alert-filters">
          <label>{t('Branch')}<select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">{t('All branches')}</option>{branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
          <label>{t('Activity')}<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">{t('All activities')}</option><option value="transactions">{t('Transactions')}</option><option value="requests">{t('Requests & warranty')}</option><option value="maintenance">{t('Maintenance & technician work')}</option><option value="stock">{t('Stock alerts')}</option><option value="other">{t('Other alerts')}</option></select></label>
          <label>{t('Priority')}<select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}><option value="all">{t('All priorities')}</option><option value="high">{t('High priority')}</option><option value="medium">{t('Medium priority')}</option><option value="low">{t('Low priority')}</option></select></label>
          <button type="button" className="alert-reset" onClick={() => { setBranchFilter('all'); setSeverityFilter('all'); setCategoryFilter('all'); }} disabled={branchFilter === 'all' && severityFilter === 'all' && categoryFilter === 'all'}>{t('Clear filters')}</button>
        </div>
        {loading ? <div className="alert-empty">{t('Loading operations alerts…')}</div> : null}
        {error ? <div className="alert-error">{t(error)}</div> : null}
        {!loading && !error && visibleAlerts.length === 0 ? <div className="alert-empty">{t('No operations alerts match these filters.')}</div> : null}
        <div className="alert-list">
          {visibleAlerts.map((alert) => {
            const order = alert.order;
            const itemSummary = order?.items?.map((item) => `${item.name} ×${item.quantity}`).join(', ') || t('Order details are not available for this legacy alert.');
            return <article key={alert.id} className="alert-card">
              <div className="alert-card-top"><div><p className="alert-reference">{order?.orderCode || alert.id}</p><h3>{alert.title || t('Customer support alert')}</h3></div><span className={`alert-severity alert-severity--${alert.severity}`}>{t(`${alert.severity} priority`)}</span></div>
              <p className="alert-concern">{alert.message || t('No message provided.')}</p>
              <dl className="alert-detail-grid">
                {order ? <><div><dt>{t('Customer')}</dt><dd>{order?.customerName || t('Not linked to a customer order')}</dd></div>
                <div><dt>{t('Purchase branch')}</dt><dd>{alert.branch === 'Not recorded' ? t('Not recorded') : alert.branch}</dd></div>
                <div><dt>{t('Customer location branch')}</dt><dd>{order?.customerBranch || t('Not recorded')}</dd></div>
                <div><dt>{t('Payment')}</dt><dd>{paymentSummary(order, t)}</dd></div>
                <div className="alert-detail-grid-wide"><dt>{t('Items')}</dt><dd>{itemSummary}</dd></div>
                </> : <><div><dt>{t('Activity')}</dt><dd>{t(CATEGORY_LABELS[alert.alertCategory] || alert.alertCategory)}</dd></div><div><dt>{t('Branch')}</dt><dd>{alert.branch === 'Not recorded' ? t('Not recorded') : alert.branch}</dd></div></>}
                <div><dt>{t(alert.currentCondition ? 'Checked' : 'Received')}</dt><dd>{alert.createdAt ? formatDate(alert.createdAt) : t('Not recorded')}</dd></div>
              </dl>
              <button type="button" className="alert-open-order" onClick={() => navigate(operationalAlertRoute(alert, "superadmin"))}>{t('Open details')}</button>
            </article>;
          })}
        </div>
      </section>
    </SuperAdminLayout>
  );
};

export default SuperAdminAlerts;
