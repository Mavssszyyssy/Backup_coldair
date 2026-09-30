import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../config/api';
import { confirmDialog } from '../../../utils/dialog';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import { formatCartHorsepower } from '../../../domain/cart/cartProductDetails';
import '../../ADMIN/Reorder/styles.css';

const displayName = (user) => user?.name || [user?.name_first, user?.name_last].filter(Boolean).join(' ') || user?.email || 'Admin';
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not recorded';
const statusLabel = (status) => ({ submitted: 'Awaiting review', approved: 'Approved', rejected: 'Rejected' }[status] || status);

export default function SuperAdminReorders({ embedded = false }) {
  const [reorders, setReorders] = useState([]);
  const [filter, setFilter] = useState('submitted');
  const [notes, setNotes] = useState({});
  const [processingId, setProcessingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoadedQueue = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/reorders');
      setReorders(result.reorders || []);
      hasLoadedQueue.current = true;
    } catch (requestError) {
      setError(
        hasLoadedQueue.current
          ? 'Could not refresh the queue. Showing the last successfully loaded requests. Please try Refresh again.'
          : (requestError.message || 'Unable to load reorder requests.'),
      );
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
    const confirmed = await confirmDialog({
      title: approval ? 'Approve Reorder Request?' : 'Reject Reorder Request?',
      message,
      confirmText: approval ? 'Approve & Add Stock' : 'Reject Request',
      destructive: !approval,
    });
    if (!confirmed) return;
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
    <SuperAdminLayout title="Inventory Management — Reorder Management" subtitle="Review branch replenishment requests and add stock safely" embedded={embedded}>
      <div className="reorder-overview"><div><strong>{reorders.filter((item) => item.status === 'submitted').length}</strong><span>Requests awaiting your decision</span></div><div><strong>{reorders.filter((item) => item.status === 'approved').length}</strong><span>Approved replenishments</span></div><button type="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {error ? <p className="reorder-message is-error">{error}</p> : null}
      <section className="reorder-history">
        <div className="reorder-panel-heading">
          <div>
            <span className="reorder-section-eyebrow">Stock replenishment</span>
            <h2>Reorder queue</h2>
            <p>Review the request details before adding stock and creating serial records.</p>
          </div>
          <label className="reorder-filter">
            <span>Show requests</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter reorder queue">
              <option value="submitted">Awaiting review</option>
              <option value="all">All requests</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>
        {loading ? <div className="reorder-empty">Loading reorder requests…</div> : visible.length === 0 ? <div className="reorder-empty">No reorder requests match this filter.</div> : (
          <div className="reorder-history-list">
            {visible.map((reorder) => (
              <article className="reorder-history-item reorder-request-card" key={reorder.id}>
                <div className="reorder-request-content">
                  <div className="reorder-request-header">
                    <div>
                      <strong>{reorder.product?.name || 'Removed product'}</strong>
                      <span className="reorder-request-summary">{formatCartHorsepower(reorder.product)} · {reorder.quantity} unit(s) · {reorder.branch || 'No branch'} branch</span>
                    </div>
                    <span className={`reorder-status status-${reorder.status}`}>{statusLabel(reorder.status)}</span>
                  </div>
                  <div className="reorder-request-meta">
                    <span><small>Requested by</small>{displayName(reorder.requestedBy)}</span>
                    <span><small>Submitted</small>{formatDate(reorder.createdAt)}</span>
                  </div>
                  {reorder.notes ? <div className="reorder-request-note"><small>Request note</small><p>{reorder.notes}</p></div> : null}
                  {reorder.status === 'submitted' ? (
                    <div className="reorder-decision-field">
                      <label htmlFor={`decision-note-${reorder.id}`}>Decision note <span>Optional</span></label>
                      <textarea
                        id={`decision-note-${reorder.id}`}
                        rows="3"
                        value={notes[reorder.id] || ''}
                        onChange={(event) => setNotes((current) => ({ ...current, [reorder.id]: event.target.value }))}
                        placeholder="Add context for the branch administrator"
                      />
                      <div className="reorder-decision-actions">
                        <button type="button" className="reorder-primary-action" disabled={processingId === reorder.id} onClick={() => decide(reorder, 'approved')}>{processingId === reorder.id ? 'Saving…' : 'Approve & Add Stock'}</button>
                        <button type="button" className="reorder-secondary-action is-danger" disabled={processingId === reorder.id} onClick={() => decide(reorder, 'rejected')}>Reject request</button>
                      </div>
                    </div>
                  ) : (
                    <div className="reorder-review-result">
                      <small>Decision record</small>
                      <p>{reorder.reviewNotes || 'No decision note'} · Reviewed {formatDate(reorder.reviewedAt)}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SuperAdminLayout>
  );
}
