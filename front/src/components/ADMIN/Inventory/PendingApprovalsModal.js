import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../config/api';
import { confirmDialog } from '../../../utils/dialog';
import './PendingApprovalsModal.css';

const PendingApprovalsModal = ({ isOpen, onClose, onRefresh }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPendingRequests();
    }
  }, [isOpen]);

  const loadPendingRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/inventory-change-requests/pending');
      setRequests(result.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    const confirmed = await confirmDialog({
      title: 'Approve Inventory Change?',
      message: 'Approve this request and apply the inventory change?',
      confirmText: 'Approve Request',
    });
    if (!confirmed) return;

    setActionInProgress(requestId);
    try {
      await apiRequest(`/inventory-change-requests/${requestId}/approve`, {
        method: 'PATCH',
      });

      alert('Request approved successfully');
      loadPendingRequests();
      onRefresh?.();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionInProgress('');
    }
  };

  const handleReject = async (requestId) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Reject Inventory Change?',
      message: 'Reject this request using the reason you entered?',
      confirmText: 'Reject Request',
      destructive: true,
    });
    if (!confirmed) return;

    setActionInProgress(requestId);
    try {
      await apiRequest(`/inventory-change-requests/${requestId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejectionReason }),
      });

      alert('Request rejected successfully');
      setSelectedRequest(null);
      setRejectionReason('');
      loadPendingRequests();
      onRefresh?.();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionInProgress('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content approval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pending Inventory Change Requests</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}

          {loading ? (
            <p className="loading-state">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="empty-state">No pending requests</p>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="request-header">
                    <div className="request-product">
                      <h4>{request.product?.name || 'Unknown Product'}</h4>
                      <p className="sku">SKU: {request.product?.sku}</p>
                      <p className="manager">Manager: {request.requestedBy?.name}</p>
                    </div>
                    <div className="request-branch">
                      <span className="branch-badge">{request.branch}</span>
                    </div>
                  </div>

                  <div className="request-details">
                    <div className="detail-row">
                      <span className="detail-label">Current Stock:</span>
                      <span className="detail-value">{request.currentStock}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Requested Addition:</span>
                      <span className="detail-value highlight">+{Math.max(0, Number(request.requestedStock) - Number(request.currentStock))}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Reason:</span>
                      <p className="reason-text">{request.reason}</p>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Requested:</span>
                      <span className="detail-value">{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {selectedRequest === request.id ? (
                    <div className="request-rejection-form">
                      <h5>Rejection Reason (required)</h5>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        rows="3"
                        className="form-textarea"
                      />
                      <div className="form-actions">
                        <button
                          className="btn-cancel"
                          onClick={() => {
                            setSelectedRequest(null);
                            setRejectionReason('');
                          }}
                          disabled={actionInProgress === request.id}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleReject(request.id)}
                          disabled={actionInProgress === request.id || !rejectionReason.trim()}
                        >
                          {actionInProgress === request.id ? 'Processing...' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="request-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApprove(request.id)}
                        disabled={actionInProgress === request.id}
                      >
                        {actionInProgress === request.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        className="btn-reject-open"
                        onClick={() => setSelectedRequest(request.id)}
                        disabled={actionInProgress === request.id}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalsModal;
