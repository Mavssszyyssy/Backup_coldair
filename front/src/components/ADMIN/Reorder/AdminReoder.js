import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import LowStockItems from './LowStockItems';
import ReorderForm from './ReorderForm';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import { formatCartHorsepower } from '../../../domain/cart/cartProductDetails';
import { formatBusinessDateTime } from '../../../utils/dateTime';
import '../adminShared.css';
import './styles.css';

const formatDate = (value) => value ? formatBusinessDateTime(value) : 'Not recorded';
const statusLabel = (status) => String(status || 'submitted').replace(/^./, (letter) => letter.toUpperCase());
const HISTORY_PAGE_SIZE = 6;

const AdminReoder = ({ embedded = false }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [reorders, setReorders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
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
  useEffect(() => { setHistoryPage(1); }, [statusFilter]);

  const visibleReorders = useMemo(
    () => statusFilter === 'all' ? reorders : reorders.filter((item) => item.status === statusFilter),
    [reorders, statusFilter],
  );
  const historyTotalPages = Math.max(1, Math.ceil(visibleReorders.length / HISTORY_PAGE_SIZE));
  const pageReorders = visibleReorders.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);
  useEffect(() => { if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages); }, [historyPage, historyTotalPages]);
  const submittedCount = reorders.filter((item) => item.status === 'submitted').length;

  return (
    <AdminLayout title={t("Reorder Management")} subtitle={t("Request stock replenishment and track SuperAdmin decisions")} embedded={embedded}>
      <div className="reorder-overview">
        <div><strong>{submittedCount}</strong><span>{t("Awaiting SuperAdmin review")}</span></div>
        <div><strong>{items.length}</strong><span>{t(items.length === 1 ? "Low-stock product" : "Low-stock products")} {t("in this branch")}</span></div>
        <button type="button" onClick={load} disabled={loading}>{t(loading ? 'Refreshing…' : 'Refresh')}</button>
      </div>
      {error ? <p className="reorder-message is-error">{t(error)}</p> : null}
      <div className="reorder-management-grid">
        <LowStockItems items={items} selectedItem={selectedItem} onSelect={setSelectedItem} />
        <ReorderForm item={selectedItem} onSubmitted={load} />
      </div>
      <section className="reorder-history">
        <div className="reorder-panel-heading"><div><h2>{t("Request history")}</h2><p>{t("Every request remains visible until it is approved or rejected.")}</p></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={t("Filter reorder history")}><option value="all">{t("All statuses")}</option><option value="submitted">{t("Awaiting review")}</option><option value="approved">{t("Approved")}</option><option value="rejected">{t("Rejected")}</option></select></div>
        {loading ? <div className="reorder-empty">{t("Loading reorder requests…")}</div> : visibleReorders.length === 0 ? <div className="reorder-empty">{t("No reorder requests match this filter.")}</div> : <div className="reorder-history-list">{pageReorders.map((reorder) => <article key={reorder.id} className="reorder-history-item"><div><strong>{reorder.product?.name || t('Removed product')}</strong><span>{formatCartHorsepower(reorder.product)} · {reorder.quantity} {t("unit(s) ·")} {reorder.branch || t('Branch not set')}</span><small>{reorder.notes || t('No additional note')} {t("· Submitted")} {t(formatDate(reorder.createdAt))}</small>{reorder.reviewNotes ? <small>{t("Review note:")} {reorder.reviewNotes}</small> : null}</div><span className={`reorder-status status-${reorder.status}`}>{t(statusLabel(reorder.status))}</span></article>)}</div>}
        {visibleReorders.length > HISTORY_PAGE_SIZE ? <nav className="reorder-pagination" aria-label={t("Reorder request history pagination")}>
          <span>{t("Showing")} {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, visibleReorders.length)} {t("of")} {visibleReorders.length}</span>
          <div><button type="button" onClick={() => setHistoryPage((current) => Math.max(1, current - 1))} disabled={historyPage === 1}>{t("Previous")}</button><span>{t("Page")} {historyPage} {t("of")} {historyTotalPages}</span><button type="button" onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))} disabled={historyPage === historyTotalPages}>{t("Next")}</button></div>
        </nav> : null}
      </section>
    </AdminLayout>
  );
};

export default AdminReoder;
