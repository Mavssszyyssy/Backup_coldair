import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import LowStockItems from './LowStockItems';
import ReorderForm from './ReorderForm';
import { apiRequest } from '../../../config/api';
import '../adminShared.css';
import './styles.css';

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not recorded';
const statusLabel = (status) => String(status || 'submitted').replace(/^./, (letter) => letter.toUpperCase());

const AdminReoder = ({ embedded = false }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [stockResult, reorderResult] = await Promise.all([
        apiRequest('/products/low-stock'),
        apiRequest('/reorders/mine'),
      ]);
      setItems(stockResult.products || []);
      setReorders(reorderResult.reorders || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load reorder management.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleReorders = useMemo(
    () => statusFilter === 'all' ? reorders : reorders.filter((item) => item.status === statusFilter),
    [reorders, statusFilter],
  );
  const submittedCount = reorders.filter((item) => item.status === 'submitted').length;

  return (
    <AdminLayout title="Reorder Management" subtitle="Request stock replenishment and track SuperAdmin decisions" embedded={embedded}>
      <div className="reorder-overview">
        <div><strong>{submittedCount}</strong><span>Awaiting SuperAdmin review</span></div>
        <div><strong>{items.length}</strong><span>Low-stock product{items.length === 1 ? '' : 's'} in this branch</span></div>
        <button type="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {error ? <p className="reorder-message is-error">{error}</p> : null}
      <div className="reorder-management-grid">
        <LowStockItems items={items} selectedItem={selectedItem} onSelect={setSelectedItem} />
        <ReorderForm item={selectedItem} onSubmitted={load} />
      </div>
      <section className="reorder-history">
        <div className="reorder-panel-heading"><div><h2>Request history</h2><p>Every request remains visible until it is approved or rejected.</p></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter reorder history"><option value="all">All statuses</option><option value="submitted">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
        {loading ? <div className="reorder-empty">Loading reorder requests…</div> : visibleReorders.length === 0 ? <div className="reorder-empty">No reorder requests match this filter.</div> : <div className="reorder-history-list">{visibleReorders.map((reorder) => <article key={reorder.id} className="reorder-history-item"><div><strong>{reorder.product?.name || 'Removed product'}</strong><span>{reorder.quantity} unit(s) · {reorder.branch || 'Branch not set'}</span><small>{reorder.notes || 'No additional note'} · Submitted {formatDate(reorder.createdAt)}</small>{reorder.reviewNotes ? <small>Review note: {reorder.reviewNotes}</small> : null}</div><span className={`reorder-status status-${reorder.status}`}>{statusLabel(reorder.status)}</span></article>)}</div>}
      </section>
    </AdminLayout>
  );
};

export default AdminReoder;
