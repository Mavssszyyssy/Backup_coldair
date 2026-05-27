import React from 'react';
import './styles.css';

const ServiceRequests = ({ requests, onSelect }) => {
  return (
    <div className="admin-card">
      <h3>Service Requests</h3>
      {requests.length === 0 ? (
        <p className="maintenance-empty">No service requests match the current filters.</p>
      ) : null}
      {requests.map((request) => (
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
    </div>
  );
};

export default ServiceRequests;
