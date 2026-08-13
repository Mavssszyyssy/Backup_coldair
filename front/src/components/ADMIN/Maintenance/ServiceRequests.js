import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';

const statusClass = (status) => String(status || 'Submitted').toLowerCase().replace(/\s+/g, '-');

const ServiceRequests = ({ requests, selectedId, onSelect }) => {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const pageRequests = useMemo(() => requests.slice((page - 1) * pageSize, page * pageSize), [page, requests]);

  useEffect(() => setPage(1), [requests]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  if (!requests.length) return <div className="maintenance-empty"><strong>No requests found</strong><span>Try changing the filters or refresh the queue.</span></div>;

  return <>
    <div className="maintenance-request-list">
      {pageRequests.map((request) => {
        const selected = String(request.id) === String(selectedId);
        return <button key={request.id} type="button" className={`maintenance-request-item ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(request)} aria-pressed={selected}>
          <span className="maintenance-request-main">
            <strong>{request.customerName || request.customer || 'Customer'}</strong>
            <span>{request.unitName || 'AC unit not specified'}</span>
            <small>{request.issueDescription || request.issue || 'No issue description'}</small>
          </span>
          <span className="maintenance-request-meta">
            <span className={`maintenance-status maintenance-status-${statusClass(request.status)}`}>{request.status || 'Submitted'}</span>
            <small>{request.assignedTechnicianName ? request.assignedTechnicianName : 'Unassigned'}</small>
          </span>
        </button>;
      })}
    </div>
    <div className="maintenance-pagination" aria-label="Service requests pagination">
      <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, requests.length)} of {requests.length}</span>
      <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button></div>
    </div>
  </>;
};

export default ServiceRequests;
