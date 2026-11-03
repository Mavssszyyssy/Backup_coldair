import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import './styles.css';

const statusClass = (status) => String(status || 'Submitted').toLowerCase().replace(/\s+/g, '-');
const requestPriority = (request = {}) =>
  String(request.priority || request.payload?.priority || 'medium').toLowerCase();
const requestSchedule = (request = {}) =>
  [
    request.scheduledDate || request.preferredDate,
    request.timeSlot || request.preferredSchedule,
  ].filter(Boolean).join(' · ') || 'Schedule not set';

const ServiceRequests = ({ requests, selectedId, onSelect }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const pageRequests = useMemo(() => requests.slice((page - 1) * pageSize, page * pageSize), [page, requests]);

  useEffect(() => setPage(1), [requests]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  if (!requests.length) return <div className="maintenance-empty"><strong>{t("No requests found")}</strong><span>{t("Try changing the filters or refresh the queue.")}</span></div>;

  return <>
    <div className="maintenance-request-list">
      {pageRequests.map((request) => {
        const selected = String(request.id) === String(selectedId);
        return <button key={request.id} type="button" className={`maintenance-request-item ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(request)} aria-pressed={selected}>
          <span className="maintenance-request-main">
            <strong>{request.customerName || request.customer || t('Customer')}</strong>
            <span>{t("Request #")}{request.requestNumber || request.id}</span>
            <span>{request.unitName || t('AC unit not specified')} · {t(request.issueType || request.serviceType || 'Service request')}</span>
            <small>{request.issueDescription || request.issue || t('No issue description')}</small>
            <small>{request.branch || t('Unassigned branch')} · {requestSchedule(request)}</small>
          </span>
          <span className="maintenance-request-meta">
            <span className={`maintenance-status maintenance-status-${statusClass(request.status)}`}>{t(request.status || 'Submitted')}</span>
            <span className={`maintenance-priority is-${requestPriority(request)}`}>{t(requestPriority(request))} {t("priority")}</span>
            <small>{request.assignedTechnicianName ? request.assignedTechnicianName : t('Unassigned')}</small>
          </span>
        </button>;
      })}
    </div>
    <div className="maintenance-pagination" aria-label={t("Service requests pagination")}>
      <span>{t("Showing")} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, requests.length)} {t("of")} {requests.length}</span>
      <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>{t("Previous")}</button><span>{t("Page")} {page} {t("of")} {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>{t("Next")}</button></div>
    </div>
  </>;
};

export default ServiceRequests;
