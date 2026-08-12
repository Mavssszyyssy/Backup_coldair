import React, { useEffect, useState } from 'react';
import './styles.css';

const ServiceRequests = ({ requests, onSelect }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const firstRequestIndex = (page - 1) * pageSize;
  const pageRequests = requests.slice(firstRequestIndex, firstRequestIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [requests]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="admin-card">
      <h3>Service Requests</h3>
      {requests.length === 0 ? (
        <p className="maintenance-empty">No service requests match the current filters.</p>
      ) : null}
      {pageRequests.map((request) => (
        <button key={request.id} className="admin-list-item maintenance-request-item" onClick={() => onSelect(request)}>
          <span className="maintenance-request-main">
            <strong>{request.customerName || request.customer}</strong>
            <span>{request.unitName || 'No unit'} · {request.issueDescription || request.issue}</span>
            <small>
              {request.assignedTechnicianName
                ? `Assigned to ${request.assignedTechnicianName}`
                : 'No technician assigned'}
            </small>
          </span>
          <span className={`maintenance-status maintenance-status-${String(request.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
            {request.status}
          </span>
        </button>
      ))}
      {requests.length > 0 ? (
        <div className="maintenance-pagination" aria-label="Service requests pagination">
          <span>Showing {firstRequestIndex + 1}-{Math.min(firstRequestIndex + pageSize, requests.length)} of {requests.length}</span>
          <div>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceRequests;
