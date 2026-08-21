import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Common/AdminLayout';
import InventoryList from './InventoryList';
import { apiRequest } from '../../../config/api';
import { useSearchParams } from 'react-router-dom';
import { ACTIVE_BRANCH_KEY } from '../../../domain/branches/branches';
import '../adminShared.css';
import './styles.css';

const BRANCHES = ['Bulacan', 'Cavite', 'Laguna', 'Bataan', 'Pangasinan', 'Ilocos'];

const getBranchStock = (product, branch) => {
  const branchStock = product?.branchStock;
  if (branchStock && typeof branchStock === 'object') {
    return Number(branchStock[branch] ?? 0);
  }
  return Number(product?.stock ?? 0);
};

const AdminInventory = () => {
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get('view') === 'products'
    ? 'products'
    : searchParams.get('view') === 'stock'
      ? 'stock'
      : 'overview';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState(() => {
    const storedBranch = localStorage.getItem(ACTIVE_BRANCH_KEY) || '';
    return BRANCHES.includes(storedBranch) ? storedBranch : BRANCHES[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
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
    load();
    const pollId = window.setInterval(load, 20000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const zeroStockCount = useMemo(
    () => products.filter((product) => getBranchStock(product, branch) === 0).length,
    [branch, products],
  );

  const pageCopy = {
    overview: {
      title: 'Inventory Overview',
      subtitle: 'Read-only branch stock visibility, product availability, and out-of-stock alerts.',
    },
    products: {
      title: 'Products / AC Units',
      subtitle: 'Review the product catalogue, model information, SKU, price, and availability for the selected branch.',
    },
    stock: {
      title: 'Stock Management',
      subtitle: 'Monitor current branch stock levels and identify low or out-of-stock AC units.',
    },
  }[activeView];

  return (
    <AdminLayout title={pageCopy.title} subtitle={pageCopy.subtitle}>
      <div className="inventory-toolbar">
        <div className="admin-card" style={{ margin: 0, padding: '12px 16px' }}>
          <strong>Monitoring access</strong><br />
          <span style={{ color: '#64748b', fontSize: 13 }}>Stock changes are managed by SuperAdmin.</span>
        </div>
        {zeroStockCount > 0 ? <div className="admin-card" style={{ margin: 0, padding: '12px 16px', borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}><strong>{zeroStockCount} out-of-stock item{zeroStockCount === 1 ? '' : 's'}</strong><br /><span style={{ fontSize: 13 }}>SuperAdmin has been notified.</span></div> : null}
      </div>
      <div className="branch-filter-section">
        <label htmlFor="admin-inventory-branch">View stock for branch</label>
        <select id="admin-inventory-branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="branch-select">
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
      <InventoryList products={products} loading={loading} onRefresh={load} branch={branch} getProductStock={(product) => getBranchStock(product, branch)} searchQuery={searchQuery} stockFilter={stockFilter} />
    </AdminLayout>
  );
};

export default AdminInventory;
