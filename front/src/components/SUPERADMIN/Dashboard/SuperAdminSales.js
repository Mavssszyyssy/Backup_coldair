import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { apiRequest } from '../../../config/api';
import { BRANCHES } from '../../../domain/branches/branches';
import '../superAdminShared.css';
import './SuperAdminSales.css';

const STAGES = [
  { id: 'all', label: 'All orders', className: 'all' },
  { id: 'pending', label: 'Pending', className: 'pending' },
  { id: 'in_progress', label: 'To be completed', className: 'progress' },
  { id: 'completed', label: 'Completed', className: 'completed' },
  { id: 'cancelled', label: 'Cancelled', className: 'cancelled' },
];
const getStage = (status = '') => {
  if (status === 'to_pay') return 'pending';
  if (status === 'to_deliver' || status === 'to_install') return 'in_progress';
  if (status === 'complete') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
};
const stageLabel = (order) => STAGES.find((stage) => stage.id === getStage(order.workflowStatus))?.label || 'Pending';
const orderBranch = (order) => String(order.stockSourceBranch || order.customerBranch || 'Unassigned').trim() || 'Unassigned';
const formatAmount = (amount) => `₱${Number(amount || 0).toLocaleString()}`;

const SuperAdminSales = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/orders');
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (requestError) {
      setOrders([]);
      setError(requestError.message || 'Unable to load processing sales.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const branchOptions = useMemo(() => Array.from(new Set([...BRANCHES, ...orders.map(orderBranch)])).filter(Boolean), [orders]);
  const branchScopedOrders = useMemo(() => orders.filter((order) => selectedBranch === 'all' || orderBranch(order) === selectedBranch), [orders, selectedBranch]);
  const stageCounts = useMemo(() => STAGES.reduce((counts, stage) => ({ ...counts, [stage.id]: stage.id === 'all' ? branchScopedOrders.length : branchScopedOrders.filter((order) => getStage(order.workflowStatus) === stage.id).length }), {}), [branchScopedOrders]);
  const visibleOrders = useMemo(() => branchScopedOrders.filter((order) => selectedStage === 'all' || getStage(order.workflowStatus) === selectedStage), [branchScopedOrders, selectedStage]);
  const groups = useMemo(() => branchOptions.map((branch) => ({ branch, orders: visibleOrders.filter((order) => orderBranch(order) === branch) })).filter((group) => group.orders.length > 0), [branchOptions, visibleOrders]);

  const clearFilters = () => { setSelectedBranch('all'); setSelectedStage('all'); };
  return (
    <SuperAdminLayout title="Processing Sales" subtitle="Global order processing with branch and status controls">
      <section className="sales-filter-summary" aria-label="Order status filters">
        {STAGES.map((stage) => <button key={stage.id} type="button" className={`sales-summary-card sales-summary-card--${stage.className} ${selectedStage === stage.id ? 'is-active' : ''}`} onClick={() => setSelectedStage(stage.id)}><span>{stage.label}</span><strong>{stageCounts[stage.id] || 0}</strong></button>)}
      </section>
      <section className="sales-workspace">
        <div className="sales-heading"><div><p className="sales-eyebrow">Order processing</p><h2>Sales queue</h2><p>Choose a branch or click a colored status card to filter the actual orders below.</p></div><button type="button" onClick={loadOrders} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
        <div className="sales-controls"><label>Purchase branch<select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}><option value="all">All branches</option>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label><label>Order stage<select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}>{STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label><button type="button" className="sales-clear" onClick={clearFilters} disabled={selectedBranch === 'all' && selectedStage === 'all'}>Clear filters</button></div>
        {error ? <div className="sales-error">{error}</div> : null}
        {loading ? <div className="sales-empty">Loading processing sales…</div> : null}
        {!loading && !error && visibleOrders.length === 0 ? <div className="sales-empty">No orders match the current branch and stage filters.</div> : null}
        <div className="sales-branch-list">{groups.map((group) => <section className="sales-branch-group" key={group.branch}><header><div><h3>{group.branch}</h3><p>{group.orders.length} matching order{group.orders.length === 1 ? '' : 's'}</p></div></header><div className="sales-order-list">{group.orders.map((order) => <article className="sales-order-card" key={order.id}><div className="sales-order-top"><div><p>{order.orderCode || order.id}</p><h4>{order.customerName || 'Customer not recorded'}</h4></div><span className={`sales-stage sales-stage--${getStage(order.workflowStatus)}`}>{stageLabel(order)}</span></div><div className="sales-order-meta"><span><b>Total</b>{formatAmount(order.totalAmount || order.total)}</span><span><b>Payment</b>{order.paymentMethod || 'Not recorded'} · {order.paymentStatus || 'pending'}</span><span><b>Purchase branch</b>{orderBranch(order)}</span>{order.customerBranch && order.customerBranch !== orderBranch(order) ? <span><b>Customer branch</b>{order.customerBranch}</span> : null}</div><p className="sales-items">{(order.items || []).map((item) => `${item.name} ×${item.quantity}`).join(', ') || 'No item details recorded.'}</p></article>)}</div></section>)}</div>
      </section>
    </SuperAdminLayout>
  );
};

export default SuperAdminSales;
