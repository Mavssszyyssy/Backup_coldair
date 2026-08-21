import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../config/api';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import '../../ADMIN/Reorder/styles.css';

const displayName = (user) => user?.name || [user?.name_first, user?.name_last].filter(Boolean).join(' ') || user?.email || 'Admin';
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not recorded';

export default function SuperAdminReorders() {
  const [reorders, setReorders] = useState([]);
  const [filter, setFilter] = useState('submitted');
  const [notes, setNotes] = useState({});
  const [processingId, setProcessingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/reorders');
      setReorders(result.reorders || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load reorder requests.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => filter === 'all' ? reorders : reorders.filter((item) => item.status === filter), [filter, reorders]);
  const decide = async (reorder, status) => {
    const approval = status === 'approved';
    const message = approval
      ? `Approve ${reorder.quantity} unit(s) of ${reorder.product?.name || 'this product'} for ${reorder.branch}? Stock will be added immediately.`
      : 'Reject this reorder request?';
    if (!window.confirm(message)) return;
    setProcessingId(reorder.id);
    setError('');
    try {
      await apiRequest(`/reorders/${reorder.id}`, { method: 'PATCH', body: JSON.stringify({ status, reviewNotes: notes[reorder.id] || '' }) });
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to review this reorder request.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <SuperAdminLayout title="Inventory Management — Reorder Approvals" subtitle="Review branch replenishment requests and add stock safely">
      <div className="reorder-overview"><div><strong>{reorders.filter((item) => item.status === 'submitted').length}</strong><span>Requests awaiting your decision</span></div><div><strong>{reorders.filter((item) => item.status === 'approved').length}</strong><span>Approved replenishments</span></div><button type="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {error ? <p className="reorder-message is-error">{error}</p> : null}
      <section className="reorder-history">
        <div className="reorder-panel-heading"><div><h2>Reorder queue</h2><p>Approval increases the selected branch stock and creates required serial records.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter reorder queue"><option value="submitted">Awaiting review</option><option value="all">All requests</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
        {loading ? <div className="reorder-empty">Loading reorder requests…</div> : visible.length === 0 ? <div className="reorder-empty">No reorder requests match this filter.</div> : <div className="reorder-history-list">{visible.map((reorder) => <article className="reorder-history-item" key={reorder.id}><div><strong>{reorder.product?.name || 'Removed product'}</strong><span>{reorder.quantity} unit(s) for {reorder.branch || 'No branch'}</span><small>Requested by {displayName(reorder.requestedBy)} · {formatDate(reorder.createdAt)}</small>{reorder.notes ? <small>Request note: {reorder.notes}</small> : null}{reorder.status === 'submitted' ? <><textarea rows="2" value={notes[reorder.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [reorder.id]: event.target.value }))} placeholder="Optional decision note" /><div style={{ display: 'flex', gap: 8, marginTop: 6 }}><button type="button" className="reorder-primary-action" disabled={processingId === reorder.id} onClick={() => decide(reorder, 'approved')}>{processingId === reorder.id ? 'Saving…' : 'Approve & Add Stock'}</button><button type="button" className="reorder-primary-action" style={{ background: '#b91c1c' }} disabled={processingId === reorder.id} onClick={() => decide(reorder, 'rejected')}>Reject</button></div></> : <small>{reorder.reviewNotes ? `Decision note: ${reorder.reviewNotes}` : 'No decision note'} · Reviewed {formatDate(reorder.reviewedAt)}</small>}</div><span className={`reorder-status status-${reorder.status}`}>{reorder.status}</span></article>)}</div>}
      </section>
    </SuperAdminLayout>
  );
}
