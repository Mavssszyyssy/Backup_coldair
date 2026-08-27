import React from 'react';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { appendAuditLog } from '../../../utils/auditLogs';
import InventorySerialQrPreview from './InventorySerialQrPreview';
import './styles.css';

const InventoryList = ({ products, loading, onRefresh, branch, onRequestChange, getProductStock, canManageStock = false, searchQuery = '', stockFilter = 'all' }) => {
  const { user } = useUser();
  const [pendingId, setPendingId] = React.useState('');
  const [rowState, setRowState] = React.useState({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const getRowState = (productId) => rowState[productId] || { quantity: '' };
  const setRowValue = (productId, next) => {
    setRowState((prev) => ({
      ...prev,
      [productId]: { ...getRowState(productId), ...next },
    }));
  };

  const getStockDisplay = (product) => {
    if (getProductStock) {
      return getProductStock(product);
    }
    return product.stock || 0;
  };

  const visibleProducts = products.filter((product) => {
    const stock = Number(getStockDisplay(product) || 0);
    const query = String(searchQuery || '').trim().toLowerCase();
    const searchable = [product.name, product.sku, product.brand, product.category, product.specs]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesSearch = !query || searchable.includes(query);
    const threshold = Number(product.threshold || 0);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'out' && stock === 0) ||
      (stockFilter === 'low' && stock > 0 && threshold > 0 && stock < threshold) ||
      (stockFilter === 'available' && stock > 0);
    return matchesSearch && matchesStock;
  });

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const firstProductIndex = (page - 1) * pageSize;
  const pageProducts = visibleProducts.slice(firstProductIndex, firstProductIndex + pageSize);
  const columnCount = 8 + (canManageStock ? 1 : 0) + (onRequestChange ? 1 : 0);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, stockFilter, branch, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const updateStock = async (productId) => {
    const { quantity } = getRowState(productId);
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    try {
      setPendingId(productId);
      await apiRequest(`/products/${productId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'add',
          quantity: qty,
          branch,
        }),
      });
      appendAuditLog({
        user: user?.email || user?.name || 'admin',
        action: 'update_inventory_stock',
        details: `Product ${productId} stock action=add qty=${qty}`,
      });
      setRowValue(productId, { quantity: '' });
      onRefresh?.();
    } catch (error) {
      alert(error.message || 'Unable to update stock');
    } finally {
      setPendingId('');
    }
  };



  return (
    <div className="admin-card">
      <h3>Inventory List</h3>
      {loading ? (
        <p>Loading…</p>
      ) : null}
      <div className="inventory-table-scroll">
        <table className="admin-table inventory-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Brand</th>
            <th>Category</th>
            <th>HP / Specs</th>
            <th>SKU</th>
            <th>Stock</th>
            <th>Serial / QR</th>
            <th>Price</th>
            {canManageStock && <th>Stock Adjustment</th>}
            {onRequestChange && <th>Manager Actions</th>}
          </tr>
        </thead>
        <tbody>
          {pageProducts.map((product, rowIndex) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.brand || '-'}</td>
              <td>{product.category || '-'}</td>
              <td>{product.specs || '-'}</td>
              <td>{product.sku}</td>
              <td className="stock-cell">
                <span className={`stock-badge ${Number(getStockDisplay(product)) === 0 ? 'stock-badge--out' : ''}`}>
                  {Number(getStockDisplay(product)) === 0 ? 'OUT OF STOCK · 0' : getStockDisplay(product)}
                </span>
              </td>
              <td className="inventory-serial-cell">
                <InventorySerialQrPreview
                  product={product}
                  branch={branch}
                  placement={rowIndex >= Math.max(0, pageProducts.length - 2) ? 'top' : 'bottom'}
                />
              </td>
              <td>PHP {product.price}</td>
              {canManageStock && (
                <td className="inventory-stock-adjustment-cell">
                  <div className="inventory-stock-adjustment">
                    <input
                      className="inventory-stock-quantity"
                      type="number"
                      min="1"
                      value={getRowState(product.id).quantity}
                      onChange={(event) => setRowValue(product.id, { quantity: event.target.value })}
                      placeholder="Qty"
                      aria-label={`Quantity to add for ${product.name}`}
                    />
                    <button className="inventory-primary-action" type="button" onClick={() => updateStock(product.id)} disabled={pendingId === product.id || !branch}>
                      {pendingId === product.id ? 'Saving...' : 'Add stock'}
                    </button>
                  </div>
                </td>
              )}

              {onRequestChange && (
                <td>
                  <button 
                    type="button" 
                    className="btn-request-change"
                    onClick={() => onRequestChange(product)}
                    disabled={pendingId === product.id}
                  >
                    Request Change
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!loading && visibleProducts.length === 0 ? (
            <tr><td colSpan={columnCount} className="inventory-empty-cell">No products match the current search and filters.</td></tr>
          ) : null}
        </tbody>
        </table>
      </div>
      {!loading && visibleProducts.length > 0 ? (
        <div className="inventory-pagination" aria-label="Inventory pagination">
          <span className="inventory-pagination-summary">
            Showing {firstProductIndex + 1}-{Math.min(firstProductIndex + pageSize, visibleProducts.length)} of {visibleProducts.length}
          </span>
          <label className="inventory-page-size">
            Rows
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Inventory rows per page"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="inventory-page-controls">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
              Next
            </button>
          </div>
        </div>
      ) : null}
      <button type="button" className="inventory-refresh-button" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
};

export default InventoryList;
