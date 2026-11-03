import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../Common/AdminLayout';
import AdminReoder from '../Reorder/AdminReoder';
import AdminSerialQr from '../SerialQr/AdminSerialQr';
import InventoryList from './InventoryList';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import useActiveBranches from '../../../domain/branches/useActiveBranches';
import { inventoryStockState } from '../../../domain/stockAlerts';
import { translateText } from '../../../utils/customerI18n';
import '../adminShared.css';
import './styles.css';

const getBranchStock = (product, branch) => {
  const branchStock = product?.branchStock;
  if (branchStock && typeof branchStock === 'object') return Number(branchStock[branch] ?? 0);
  return Number(product?.stock ?? 0);
};

const InventoryTabs = ({ activeTab, onSelect, t }) => (
  <div className="module-tabs" role="tablist" aria-label={t('Inventory management sections')}>
    <button type="button" role="tab" aria-selected={activeTab === 'inventory'} className={activeTab === 'inventory' ? 'active' : ''} onClick={() => onSelect('inventory')}>{t('Inventory / Stock')}</button>
    <button type="button" role="tab" aria-selected={activeTab === 'reorder'} className={activeTab === 'reorder' ? 'active' : ''} onClick={() => onSelect('reorder')}>{t('Reorder Management')}</button>
    <button type="button" role="tab" aria-selected={activeTab === 'serial-qr'} className={activeTab === 'serial-qr' ? 'active' : ''} onClick={() => onSelect('serial-qr')}>{t('Serial / QR Management')}</button>
  </div>
);

const AdminInventory = () => {
  const branchNames = useActiveBranches();
  const { user, currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'reorder'
    ? 'reorder'
    : searchParams.get('tab') === 'serial-qr'
      ? 'serial-qr'
      : 'inventory';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const assignedBranch = useMemo(() => {
    const currentBranch = user?.activeBranch || user?.assignedBranch || '';
    return branchNames.includes(currentBranch) ? currentBranch : '';
  }, [branchNames, user?.activeBranch, user?.assignedBranch]);
  const [branch, setBranch] = useState(assignedBranch);
  const branchOptions = useMemo(
    () => assignedBranch
      ? [assignedBranch, ...branchNames.filter((item) => item !== assignedBranch)]
      : branchNames,
    [assignedBranch, branchNames],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    setBranch(assignedBranch);
  }, [assignedBranch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!branch) {
      setProducts([]);
      setError('This Admin account does not have a valid branch assignment.');
      setLoading(false);
      return;
    }
    try {
      const result = await apiRequest(`/products?branch=${encodeURIComponent(branch)}`);
      setProducts(result.products || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    if (activeTab !== 'inventory') return undefined;
    load();
    const pollId = window.setInterval(load, 20000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [activeTab, load]);

  const stockStates = useMemo(() => products.filter((product) => product.isActive !== false).map((product) => inventoryStockState(product, branch, getBranchStock(product, branch))), [products, branch]);
  const zeroStockCount = stockStates.filter((state) => state === 'out').length;
  const lowStockCount = stockStates.filter((state) => state === 'low').length;
  const healthyStockCount = stockStates.filter((state) => state === 'available').length;

  const selectTab = (tab) => setSearchParams(tab === 'inventory' ? {} : { tab }, { replace: true });

  return (
    <AdminLayout title={t('Inventory Management')} subtitle={t('Manage inventory, replenishment requests, and AC unit serial / QR records in one workspace.')}>
      <InventoryTabs activeTab={activeTab} onSelect={selectTab} t={t} />
      {activeTab === 'inventory' ? (
        <>
          <div className="inventory-toolbar">
            <div className="admin-card inventory-stock-summary-card is-healthy"><strong>{healthyStockCount}</strong><span>{t('Items in stock')}</span></div>
            <div className="admin-card inventory-stock-summary-card is-low"><strong>{lowStockCount}</strong><span>{t(lowStockCount === 1 ? 'Item is low on stock' : 'Items are low on stock')}</span></div>
            <div className="admin-card inventory-stock-summary-card is-out"><strong>{zeroStockCount}</strong><span>{t(zeroStockCount === 1 ? 'Item is out of stock' : 'Items are out of stock')}</span></div>
          </div>
          <div className="branch-filter-section">
            <label htmlFor="admin-inventory-branch">{t('View stock for branch')}</label>
            <select id="admin-inventory-branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="branch-select">
              {branchOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input className="inventory-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('Search name, SKU, brand, category…')} aria-label={t('Search inventory')} />
            <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="branch-select" aria-label={t('Filter by stock status')}>
              <option value="all">{t('All stock states')}</option>
              <option value="out">{t('Out of stock')}</option>
              <option value="low">{t('Low stock')}</option>
              <option value="available">{t('In stock')}</option>
            </select>
          </div>
          {error ? <p style={{ color: '#b91c1c' }}>{t(error)}</p> : null}
          <InventoryList products={products} loading={loading} onRefresh={load} branch={branch} getProductStock={(product) => getBranchStock(product, branch)} searchQuery={searchQuery} stockFilter={stockFilter} />
        </>
      ) : null}
      {activeTab === 'reorder' ? <AdminReoder embedded /> : null}
      {activeTab === 'serial-qr' ? <AdminSerialQr embedded /> : null}
    </AdminLayout>
  );
};

export default AdminInventory;
