import React, { useState } from 'react';
import { apiRequest } from '../../../config/api';
import './InventoryChangeRequestModal.css';

const InventoryChangeRequestModal = ({ isOpen, product, currentStock, onClose, onSuccess }) => {
  const [addQuantity, setAddQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!addQuantity || !reason.trim()) {
      setError('Both quantity and reason are required');
      return;
    }

    const qty = Number(addQuantity);
    if (!/^\d+$/.test(String(addQuantity).trim()) || !Number.isSafeInteger(qty) || qty <= 0) {
      setError('Quantity must be a positive whole number.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/inventory-change-requests', {
        method: 'POST',
        body: JSON.stringify({
          productId: product._id || product.id,
          currentStock: Number(currentStock),
          addQuantity: qty,
          reason: reason.trim(),
        }),
      });

      alert('Request submitted successfully');
      setAddQuantity('');
      setReason('');
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Stock Addition</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Product</label>
            <p className="product-info">{product.name}</p>
            <small>SKU: {product.sku}</small>
          </div>

          <div className="form-group">
            <label>Current Stock</label>
            <p className="current-stock">{currentStock} units</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="addQuantity">Add Stock Quantity *</label>
              <input
                id="addQuantity"
                type="number"
                min="1"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                placeholder="Enter quantity to add"
                className="form-input"
              />
              <small>Stock requests are add-only and will increase current branch stock.</small>
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for Change *</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need this change..."
                rows="4"
                className="form-textarea"
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InventoryChangeRequestModal;
