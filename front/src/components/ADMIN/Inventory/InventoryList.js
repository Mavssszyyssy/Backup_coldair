import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { appendAuditLog } from '../../../utils/auditLogs';
import { alertDialog } from '../../../utils/dialog';
import { sortInventoryProducts } from '../../../domain/inventorySort';
import { inventoryStockState } from '../../../domain/stockAlerts';
import { isFilipino, translateText } from '../../../utils/customerI18n';
import './styles.css';

const priceFormat = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });

const InventoryList = ({ products, loading, onRefresh, branch, onRequestChange, getProductStock, canManageStock = false, searchQuery = '', stockFilter = 'all' }) => {
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [pendingId, setPendingId] = React.useState('');
  const [rowState, setRowState] = React.useState({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sort, setSort] = React.useState('recent');

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

  const visibleProducts = sortInventoryProducts(products.filter((product) => {
    const stock = Number(getStockDisplay(product) || 0);
    const query = String(searchQuery || '').trim().toLowerCase();
    const searchable = [product.name, product.sku, product.brand, product.category, product.specs]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesSearch = !query || searchable.includes(query);
    const state = inventoryStockState(product, branch, stock);
    const matchesStock =
      stockFilter === 'all' ||
      stockFilter === state;
    return matchesSearch && matchesStock;
  }), sort);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const firstProductIndex = (page - 1) * pageSize;
  const pageProducts = visibleProducts.slice(firstProductIndex, firstProductIndex + pageSize);
  const columnCount = 7 + (canManageStock ? 1 : 0) + (onRequestChange ? 1 : 0);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, stockFilter, branch, pageSize, sort]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const updateStock = async (productId) => {
    const { quantity } = getRowState(productId);
    const qty = Number(quantity);
    if (!/^\d+$/.test(String(quantity).trim()) || !Number.isSafeInteger(qty) || qty <= 0) {
      alert(t('Quantity must be a positive whole number.'));
      return;
    }
    const product = products.find((item) => item.id === productId || item._id === productId);
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
      void alertDialog({
        title: t('Stock added successfully'),
        message: isFilipino(currentLanguage)
          ? `${t('Added')} ${qty} ${t(qty === 1 ? 'unit' : 'units')} ${t('of')} ${product?.name || t('the selected product')} ${t('to the inventory of')} ${branch}.`
          : `${qty} ${qty === 1 ? 'unit' : 'units'} of ${product?.name || 'the selected product'} ${qty === 1 ? 'was' : 'were'} added to the ${branch} inventory.`,
        confirmText: t('Done'),
      });
    } catch (error) {
      alert(t(error.message || 'Unable to update stock'));
    } finally {
      setPendingId('');
    }
  };



  return (
    <div className="admin-card">
      <h3>{t('Inventory List')}</h3>
      {loading ? (
        <p>{t('Loading…')}</p>
      ) : null}
      <label className="inventory-sort-control">{t('Sort products')} <select aria-label={t('Sort inventory')} value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">{t('Newest first')}</option><option value="name-asc">{t('Product Name — A to Z')}</option><option value="name-desc">{t('Product Name — Z to A')}</option></select></label>
      <div className="inventory-table-scroll">
        <table className={`admin-table inventory-table${canManageStock || onRequestChange ? ' inventory-table--with-actions' : ''}`}>
        <thead>
          <tr>
            <th>{t('Name')}</th>
            <th>{t('Brand')}</th>
            <th>{t('Category')}</th>
            <th>{t('HP / Specs')}</th>
            <th>SKU</th>
            <th>{t('Stock')}</th>
            <th>{t('Price')}</th>
            {canManageStock && <th>{t('Stock Adjustment')}</th>}
            {onRequestChange && <th>{t('Manager Actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {pageProducts.map((product) => (
            <tr key={product.id}>
              <td>
                {product.name}
                <Link
                  className="inventory-unit-link"
                  to={`?${new URLSearchParams({ tab: 'serial-qr', productId: product.id, ...(branch ? { branch } : {}) })}`}
                  aria-label={`${t('View unit records')}: ${product.name}${product.sku ? ` (${product.sku})` : ''}`}
                >
                  {t('View unit records')}
                </Link>
              </td>
              <td>{product.brand || '-'}</td>
              <td>{product.category || '-'}</td>
              <td>{product.specs || '-'}</td>
              <td>{product.sku}</td>
              <td className="stock-cell">
                <span className={`stock-badge ${inventoryStockState(product, branch, getStockDisplay(product)) === 'out' ? 'stock-badge--out' : inventoryStockState(product, branch, getStockDisplay(product)) === 'low' ? 'stock-badge--low' : ''}`}>
                  {t(inventoryStockState(product, branch, getStockDisplay(product)) === 'out' ? 'Out of stock' : inventoryStockState(product, branch, getStockDisplay(product)) === 'low' ? 'Low stock' : 'In stock')} · {getStockDisplay(product)}
                </span>
              </td>
              <td className="inventory-price">{product.price != null && product.price !== '' && Number.isFinite(Number(product.price)) ? `PHP ${priceFormat.format(Number(product.price))}` : '—'}</td>
              {canManageStock && (
                <td className="inventory-stock-adjustment-cell">
                  <div className="inventory-stock-adjustment">
                    <input
                      className="inventory-stock-quantity"
                      type="number"
                      min="1"
                      value={getRowState(product.id).quantity}
                      onChange={(event) => setRowValue(product.id, { quantity: event.target.value })}
                      placeholder={t('Qty')}
                      aria-label={`${t('Quantity to add for')} ${product.name}`}
                    />
                    <button className="inventory-primary-action" type="button" onClick={() => updateStock(product.id)} disabled={pendingId === product.id || !branch}>
                      {t(pendingId === product.id ? 'Saving...' : 'Add stock')}
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
                    {t('Request Change')}
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!loading && visibleProducts.length === 0 ? (
            <tr><td colSpan={columnCount} className="inventory-empty-cell">{t('No products match the current search and filters.')}</td></tr>
          ) : null}
        </tbody>
        </table>
      </div>
      {!loading && visibleProducts.length > 0 ? (
        <div className="inventory-pagination" aria-label={t('Inventory pagination')}>
          <span className="inventory-pagination-summary">
            {t('Showing')} {firstProductIndex + 1}-{Math.min(firstProductIndex + pageSize, visibleProducts.length)} {t('of')} {visibleProducts.length}
          </span>
          <label className="inventory-page-size">
            {t('Rows')}
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label={t('Inventory rows per page')}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="inventory-page-controls">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              {t('Previous')}
            </button>
            <span>{t('Page')} {page} {t('of')} {totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
              {t('Next')}
            </button>
          </div>
        </div>
      ) : null}
      <button type="button" className="inventory-refresh-button" onClick={onRefresh}>
        {t('Refresh')}
      </button>
    </div>
  );
};

export default InventoryList;
