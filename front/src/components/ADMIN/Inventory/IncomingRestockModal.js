import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../config/api';
import { confirmDialog } from '../../../utils/dialog';
import './IncomingRestockModal.css';

const IncomingRestockModal = ({ isOpen, onClose, onRefresh }) => {
  const [restocks, setRestocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [receivedQtys, setReceivedQtys] = useState({});
  const [actionInProgress, setActionInProgress] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRestocks();
    }
  }, [isOpen]);

  const loadRestocks = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/restock-orders/my-deliveries');
      setRestocks(result.restockOrders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start, end) => {
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} - ${e}`;
  };

  const handleMarkReceived = async (restockId) => {
    const confirmed = await confirmDialog({
      title: 'Confirm Restock Receipt',
      message: 'Mark this delivery as received using the quantities shown?',
      confirmText: 'Mark Received',
    });
    if (!confirmed) return;

    const receivedProducts = restocks
      .find((r) => r.id === restockId)
      ?.products.map((p) => ({
        productId: p.product?.id || p.product,
        quantity: Number(receivedQtys[`${restockId}-${p.product?.id || p.product}`]) || p.quantity,
      })) || [];

    setActionInProgress(restockId);
    try {
      await apiRequest(`/restock-orders/${restockId}/receive`, {
        method: 'PATCH',
        body: JSON.stringify({ receivedProducts }),
      });

      alert('Restock marked as received successfully');
      loadRestocks();
      setExpandedId(null);
      setReceivedQtys({});
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
      <div className="modal-content incoming-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Incoming Restock Deliveries</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}

          {loading ? (
            <p className="loading-state">Loading deliveries...</p>
          ) : restocks.length === 0 ? (
            <p className="empty-state">No incoming deliveries</p>
          ) : (
            <div className="restocks-list">
              {restocks.map((restock) => (
                <div key={restock.id} className="restock-item">
                  <div
                    className="restock-header"
                    onClick={() =>
                      setExpandedId(expandedId === restock.id ? null : restock.id)
                    }
                  >
                    <div className="restock-summary">
                      <h4>{restock.supplier?.name || 'Unknown Supplier'}</h4>
                      <p className="date-range">
                        Expected: {formatDateRange(restock.expectedDeliveryStart, restock.expectedDeliveryEnd)}
                      </p>
                      <p className="product-count">{restock.products?.length || 0} products</p>
                    </div>
                    <div className="restock-status">
                      <span className={`status-badge status-${restock.status}`}>
                        {restock.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="expand-icon">{expandedId === restock.id ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {expandedId === restock.id && (
                    <div className="restock-details">
                      {restock.supplier?.contact && (
                        <p><strong>Contact:</strong> {restock.supplier.contact}</p>
                      )}
                      {restock.supplier?.phone && (
                        <p><strong>Phone:</strong> {restock.supplier.phone}</p>
                      )}
                      {restock.supplier?.email && (
                        <p><strong>Email:</strong> {restock.supplier.email}</p>
                      )}

                      <h5>Products</h5>
                      <div className="products-table">
                        <div className="table-header">
                          <div className="col-name">Product</div>
                          <div className="col-qty">Ordered</div>
                          <div className="col-qty">Received</div>
                        </div>
                        {restock.products?.map((product, index) => (
                          <div key={index} className="table-row">
                            <div className="col-name">
                              <p className="product-name">{product.product?.name || 'Unknown'}</p>
                              <p className="sku">SKU: {product.product?.sku}</p>
                            </div>
                            <div className="col-qty">{product.quantity}</div>
                            <div className="col-qty">
                              <input
                                type="number"
                                min="0"
                                max={product.quantity}
                                value={
                                  receivedQtys[
                                    `${restock.id}-${product.product?.id || product.product}`
                                  ] ?? product.quantity
                                }
                                onChange={(e) =>
                                  setReceivedQtys({
                                    ...receivedQtys,
                                    [`${restock.id}-${product.product?.id || product.product}`]:
                                      e.target.value,
                                  })
                                }
                                className="qty-input"
                                disabled={actionInProgress === restock.id}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {restock.status === 'incoming' && (
                        <div className="restock-actions">
                          <button
                            className="btn-receive"
                            onClick={() => handleMarkReceived(restock.id)}
                            disabled={actionInProgress === restock.id}
                          >
                            {actionInProgress === restock.id
                              ? 'Processing...'
                              : 'Mark as Received'}
                          </button>
                        </div>
                      )}
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

export default IncomingRestockModal;
