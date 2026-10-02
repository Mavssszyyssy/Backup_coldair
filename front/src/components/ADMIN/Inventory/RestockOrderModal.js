import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../config/api';
import { BRANCHES } from '../../../domain/branches/branches';
import PersistentErrorNotice from '../../common/PersistentErrorNotice';
import './RestockOrderModal.css';

const RestockOrderModal = ({ isOpen, onClose, onSuccess }) => {
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [expectedStart, setExpectedStart] = useState('');
  const [expectedEnd, setExpectedEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const result = await apiRequest('/products');
      setAllProducts(result.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const handleAddProduct = () => {
    setProducts([...products, { product: '', quantity: 1, receivedQuantity: 0 }]);
  };

  const handleRemoveProduct = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index, field, value) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const handleBranchToggle = (branch) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!supplierName.trim()) {
      setError('Supplier name is required');
      return;
    }

    if (selectedBranches.length === 0) {
      setError('Select at least one branch');
      return;
    }

    if (products.length === 0 || products.some((p) => !p.product || p.quantity < 1)) {
      setError('Add at least one product with quantity > 0');
      return;
    }

    if (!expectedStart || !expectedEnd) {
      setError('Expected delivery dates are required');
      return;
    }

    const startDate = new Date(expectedStart);
    const endDate = new Date(expectedEnd);

    if (startDate >= endDate) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/restock-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier: {
            name: supplierName,
            contact: supplierContact,
            email: supplierEmail,
            phone: supplierPhone,
          },
          branches: selectedBranches,
          products: products.map((p) => ({
            product: p.product,
            quantity: Number(p.quantity),
          })),
          expectedDeliveryStart: startDate.toISOString(),
          expectedDeliveryEnd: endDate.toISOString(),
          notes,
        }),
      });

      alert('Restock order created successfully');
      resetForm();
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to create restock order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSupplierName('');
    setSupplierContact('');
    setSupplierEmail('');
    setSupplierPhone('');
    setSelectedBranches([]);
    setProducts([]);
    setExpectedStart('');
    setExpectedEnd('');
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <PersistentErrorNotice
        title="Please check the restock order"
        message={error}
        onDismiss={() => setError('')}
      />
      <div className="modal-content restock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Restock Order</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Supplier Info */}
            <div className="form-section">
              <h4>Supplier Information</h4>

              <div className="form-group">
                <label htmlFor="supplierName">Supplier Name *</label>
                <input
                  id="supplierName"
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Supplier name"
                  className="form-input"
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="supplierEmail">Email</label>
                  <input
                    id="supplierEmail"
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="supplier@example.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="supplierPhone">Phone</label>
                  <input
                    id="supplierPhone"
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="+63 9XX XXXXXX"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Branches */}
            <div className="form-section">
              <h4>Branches to Restock *</h4>
              <div className="branches-grid">
                {BRANCHES.map((branch) => (
                  <label key={branch} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch)}
                      onChange={() => handleBranchToggle(branch)}
                    />
                    <span>{branch}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="form-section">
              <div className="section-header">
                <h4>Products to Restock *</h4>
                <button
                  type="button"
                  className="btn-add-product"
                  onClick={handleAddProduct}
                  disabled={loading}
                >
                  + Add Product
                </button>
              </div>

              <div className="products-list">
                {products.length === 0 ? (
                  <p className="empty-state">No products added. Click "Add Product" to start.</p>
                ) : (
                  products.map((item, index) => (
                    <div key={index} className="product-row">
                      <select
                        value={item.product}
                        onChange={(e) => handleProductChange(index, 'product', e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select product...</option>
                        {allProducts.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.name} (SKU: {p.sku})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="form-input quantity"
                      />

                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => handleRemoveProduct(index)}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="form-section">
              <h4>Expected Delivery Date Range *</h4>

              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="expectedStart">Start Date</label>
                  <input
                    id="expectedStart"
                    type="date"
                    value={expectedStart}
                    onChange={(e) => setExpectedStart(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expectedEnd">End Date</label>
                  <input
                    id="expectedEnd"
                    type="date"
                    value={expectedEnd}
                    onChange={(e) => setExpectedEnd(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <h4>Notes</h4>

              <div className="form-group">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows="3"
                  className="form-textarea"
                />
              </div>
            </div>

            {/* Actions */}
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
                {loading ? 'Creating...' : 'Create Restock Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RestockOrderModal;
