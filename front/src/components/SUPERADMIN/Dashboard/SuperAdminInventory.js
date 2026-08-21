import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import { BRANCHES } from '../../../domain/branches/branches';
import InventoryList from '../../ADMIN/Inventory/InventoryList';
import AdminSerialQr from '../../ADMIN/SerialQr/AdminSerialQr';
import SuperAdminLayout from '../Common/SuperAdminLayout';
import SuperAdminReorders from './SuperAdminReorders';
import '../../ADMIN/Inventory/styles.css';
import '../superAdminShared.css';

const getBranchStock = (product, branch) => Number(product?.branchStock?.[branch] ?? 0);

const TABS = [
  { id: 'checker', label: 'Inventory Checker' },
  { id: 'serial-qr', label: 'Serial / QR Registry' },
  { id: 'reorders', label: 'Reorder Approvals' },
];

const SuperAdminInventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'checker';
  const [products, setProducts] = useState([]);
  const [branch, setBranch] = useState(BRANCHES[0] || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

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
    if (activeTab === 'checker') load();
  }, [activeTab, load]);

  const outOfStock = useMemo(
    () => products.filter((product) => getBranchStock(product, branch) === 0),
    [branch, products],
  );

  const selectTab = (tab) => setSearchParams(tab === 'checker' ? {} : { tab }, { replace: true });

  return (
    <SuperAdminLayout title="Inventory Management" subtitle="Review branch stock, serial / QR records, and replenishment approvals in one executive workspace.">
      <div className="module-tabs" role="tablist" aria-label="Super Admin inventory management sections">
        {TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
      </div>
      {activeTab === 'checker' ? (
        <>
          <div className="super-card" style={{ marginBottom: 18, borderColor: outOfStock.length ? '#fecaca' : undefined }}>
            <h3>{outOfStock.length ? `${outOfStock.length} out-of-stock alert${outOfStock.length === 1 ? '' : 's'}` : 'Inventory healthy'}</h3>
            <p className="super-muted">{outOfStock.length ? `These items have exactly 0 stock in ${branch}. Add stock below to make them available again.` : `No items are at zero stock in ${branch}.`}</p>
            {outOfStock.length ? <div className="super-list">{outOfStock.map((product) => <div className="super-list-item" key={product.id}><strong>{product.name}</strong><br /><span>{product.sku} · {branch} · 0 stock</span></div>)}</div> : null}
          </div>
          <div className="branch-filter-section">
            <label htmlFor="super-inventory-branch">Manage branch</label>
            <select id="super-inventory-branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="branch-select">
              {BRANCHES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input className="inventory-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search name, SKU, brand, category…" aria-label="Search inventory" />
            <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="branch-select" aria-label="Filter by stock status">
              <option value="all">All stock states</option>
              <option value="out">Out of stock</option>
              <option value="low">Low stock</option>
              <option value="available">In stock</option>
            </select>
          </div>
          {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
          <InventoryList products={products} loading={loading} onRefresh={load} branch={branch} getProductStock={(product) => getBranchStock(product, branch)} canManageStock searchQuery={searchQuery} stockFilter={stockFilter} />
        </>
      ) : null}
      {activeTab === 'serial-qr' ? <AdminSerialQr embedded /> : null}
      {activeTab === 'reorders' ? <SuperAdminReorders embedded /> : null}
    </SuperAdminLayout>
  );
};

export default SuperAdminInventory;
