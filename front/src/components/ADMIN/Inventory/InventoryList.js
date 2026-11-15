import SearchableSelect from "../../common/SearchableSelect";
import LoadingSkeleton from "../../common/LoadingSkeleton";
import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { appendAuditLog } from '../../../utils/auditLogs';
import { alertDialog } from '../../../utils/dialog';
import { sortInventoryProducts } from '../../../domain/inventorySort';
import { inventoryStockState } from '../../../domain/stockAlerts';
import { isFilipino, translateText } from '../../../utils/customerI18n';
import { formatPesoAmount } from '../../../utils/currency';
import './styles.css';

const productFilters = [
  { field: 'brand', label: 'Brand', all: 'All brands' },
  { field: 'category', label: 'Category', all: 'All categories' },
  { field: 'specs', label: 'HP / Specs', all: 'All specs' },
];
const filterKey = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const categoryLabels = new Map([['split', 'Split type'], ['window', 'Window type'], ['floor', 'Floor mounted']]);

function inventoryFilterValue(product, field) {
  const key = filterKey(product[field]);
  const horsepower = field === 'specs' && key.match(/^(\d+(?:\.\d+)?)(?:\s*hp)?$/);
  return horsepower ? `${Number(horsepower[1])} hp` : key;
}

function getFilterOptions(products, field) {
  const labels = new Map();
  for (const product of products) {
    const key = inventoryFilterValue(product, field);
    if (key && !labels.has(key)) {
      const label = field === 'specs' && /^\d+(?:\.\d+)? hp$/.test(key) ? key.replace(' hp', ' HP') : String(product[field]).trim();
      labels.set(key, label);
    }
  }
  return new Map([...labels].sort(([, left], [, right]) => left.localeCompare(right, 'en-PH', { numeric: true })));
}

const InventoryList = ({ products, loading, onRefresh, branch, onRequestChange, getProductStock, canManageStock = false, searchQuery = '', stockFilter = 'all' }) => {
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [pendingId, setPendingId] = React.useState('');
  const [rowState, setRowState] = React.useState({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sort, setSort] = React.useState('recent');
  const [filters, setFilters] = React.useState({});
  const filterOptions = React.useMemo(() => productFilters.map(({ field }) => getFilterOptions(products, field)), [products]);
  const query = filterKey(searchQuery);

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
    const searchable = [product.name, product.sku, product.brand, product.category, product.specs]
      .map(filterKey)
      .join(' ');
    const matchesSearch = !query || searchable.includes(query);
    const state = inventoryStockState(product, branch, stock);
    const matchesStock =
      stockFilter === 'all' ||
      stockFilter === state;
    return matchesSearch && matchesStock && productFilters.every(({ field }, index) => {
      const selected = filters[field];
      return !filterOptions[index].has(selected) || inventoryFilterValue(product, field) === selected;
    });
  }), sort);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstProductIndex = (currentPage - 1) * pageSize;
  const pageProducts = visibleProducts.slice(firstProductIndex, firstProductIndex + pageSize);
  const columnCount = 7 + (canManageStock ? 1 : 0) + (onRequestChange ? 1 : 0);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, stockFilter, branch, pageSize, sort, filters]);

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
      <div className="inventory-list-heading">
        <h3>{t('Inventory List')}</h3>
        {onRefresh && <button type="button" className="inventory-refresh-button" onClick={onRefresh} disabled={loading}>
          {t(loading ? 'Refreshing…' : 'Refresh')}
        </button>}
      </div>
      <div className="inventory-list-filters">
        {productFilters.map(({ field, label, all }, index) => (
          <label key={field}>
            <span>{t(label)}</span>
            <SearchableSelect
              value={filterOptions[index].has(filters[field]) ? filters[field] : ''}
              onChange={(event) => {
                const value = event.target.value;
                setFilters((previous) => ({ ...previous, [field]: value }));
              }}
            >
              <option value="">{t(all)}</option>
              {[...filterOptions[index]].map(([key, name]) => (
                <option key={key} value={key}>{field === 'category' && categoryLabels.has(key) ? t(categoryLabels.get(key)) : name}</option>
              ))}
            </SearchableSelect>
          </label>
        ))}
        <label>
          <span>{t('Sort products')}</span>
          <SearchableSelect aria-label={t('Sort inventory')} value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">{t('Newest first')}</option>
            <option value="name-asc">{t('Product Name — A to Z')}</option>
            <option value="name-desc">{t('Product Name — Z to A')}</option>
          </SearchableSelect>
        </label>
      </div>
      {loading && !products.length ? (
        <LoadingSkeleton label={t('Loading…')} variant="table" />
      ) : null}
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
              <td className="inventory-price">{product.price != null && product.price !== '' && Number.isFinite(Number(product.price)) ? `PHP ${formatPesoAmount(product.price)}` : '—'}</td>
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
        <nav className="inventory-pagination" aria-label={t('Inventory pagination')}>
          <span className="inventory-pagination-summary">
            {t('Showing')} {firstProductIndex + 1}-{Math.min(firstProductIndex + pageSize, visibleProducts.length)} {t('of')} {visibleProducts.length}
          </span>
          <div className="inventory-pagination-actions">
            <label className="inventory-page-size">
              {t('Rows')}
              <SearchableSelect
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                aria-label={t('Inventory rows per page')}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </SearchableSelect>
            </label>
            <div className="inventory-page-controls">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
                {t('Previous')}
              </button>
              <span>{t('Page')} {currentPage} {t('of')} {totalPages}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>
                {t('Next')}
              </button>
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
};

export default InventoryList;
