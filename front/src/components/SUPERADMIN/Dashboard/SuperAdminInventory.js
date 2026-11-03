import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import useActiveBranches from '../../../domain/branches/useActiveBranches';
import InventoryList from '../../ADMIN/Inventory/InventoryList';
import AdminSerialQr from '../../ADMIN/SerialQr/AdminSerialQr';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import SuperAdminCatalog from './SuperAdminCatalog';
import SuperAdminReorders from './SuperAdminReorders';
import '../../ADMIN/Inventory/styles.css';
import '../superAdminShared.css';

const getBranchStock = (product, branch) => Number(product?.branchStock?.[branch] ?? 0);

const TABS = [
  { id: 'catalog', label: 'Catalog Management' },
  { id: 'checker', label: 'Inventory Checker' },
  { id: 'reorders', label: 'Reorder Management' },
  { id: 'serial-qr', label: 'Serial / QR Registry' },
];

const SuperAdminInventory = () => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const branchNames = useActiveBranches();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'catalog';
  const [products, setProducts] = useState([]);
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  useEffect(() => {
    if (branchNames.length && !branchNames.includes(branch)) setBranch(branchNames[0]);
  }, [branch, branchNames]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/products');
      setProducts(result.products || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'checker' || activeTab === 'catalog') load();
  }, [activeTab, load]);

  const outOfStock = useMemo(
    () => products.filter((product) => getBranchStock(product, branch) === 0),
    [branch, products],
  );

  const selectTab = (tab) => setSearchParams(tab === 'catalog' ? {} : { tab }, { replace: true });

  return (
    <SuperAdminLayout title={t('Inventory Management')} subtitle={t('Review branch stock, serial / QR records, and replenishment requests in one executive workspace.')}>
      <div className="module-tabs" role="tablist" aria-label={t('Super Admin inventory management sections')}>
        {TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => selectTab(tab.id)}>{t(tab.label)}</button>)}
      </div>
      {activeTab === 'catalog' ? <SuperAdminCatalog onCreated={load} /> : null}
      {activeTab === 'checker' ? (
        <>
          <div className="super-card" style={{ marginBottom: 18, borderColor: outOfStock.length ? '#fecaca' : undefined }}>
            <h3>{outOfStock.length ? `${outOfStock.length} ${t(outOfStock.length === 1 ? 'out-of-stock alert' : 'out-of-stock alerts')}` : t('Inventory healthy')}</h3>
            <p className="super-muted">{outOfStock.length ? `${t('These items have exactly 0 stock in')} ${branch}. ${t('Add stock below to make them available again.')}` : `${t('No items are at zero stock in')} ${branch}.`}</p>
            {outOfStock.length ? <div className="super-list">{outOfStock.map((product) => <div className="super-list-item" key={product.id}><strong>{product.name}</strong><br /><span>{product.sku} · {branch} · 0 {t('stock')}</span></div>)}</div> : null}
          </div>
          <div className="branch-filter-section">
            <label htmlFor="super-inventory-branch">{t('Manage branch')}</label>
            <select id="super-inventory-branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="branch-select">
              {branchNames.map((item) => <option key={item} value={item}>{item}</option>)}
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
          <InventoryList products={products} loading={loading} onRefresh={load} branch={branch} getProductStock={(product) => getBranchStock(product, branch)} canManageStock searchQuery={searchQuery} stockFilter={stockFilter} />
        </>
      ) : null}
      {activeTab === 'serial-qr' ? <AdminSerialQr embedded /> : null}
      {activeTab === 'reorders' ? <SuperAdminReorders embedded /> : null}
    </SuperAdminLayout>
  );
};

export default SuperAdminInventory;
