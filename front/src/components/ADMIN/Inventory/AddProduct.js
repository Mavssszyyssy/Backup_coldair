import React, { useState } from 'react';
import { apiRequest } from '../../../config/api';
import { BRANCHES } from '../../../domain/branches/branches';
import { getSessionActiveBranch } from '../../../utils/authSession';
import { useUser } from '../../../context/UserContext';
import { appendAuditLog } from '../../../utils/auditLogs';
import './styles.css';

const initialForm = {
  name: '',
  sku: '',
  brand: '',
  category: 'split',
  specs: '',
  features: '',
  threshold: '',
  price: '',
  stockBulacan: '',
  stockCavite: '',
  stockLaguna: '',
  stockBataan: '',
  stockPangasinan: '',
  stockIlocos: '',
};

const AddProduct = ({ onCreated }) => {
  const { user } = useUser();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeBranch = getSessionActiveBranch() || user?.activeBranch || user?.assignedBranch || '';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.sku) return;
    setError('');
    setSaving(true);
    try {
      const result = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          sku: form.sku,
          brand: form.brand,
          category: form.category,
          specs: form.specs,
          features: form.features
            .split(',')
            .map((feature) => feature.trim())
            .filter(Boolean),
          threshold: Number(form.threshold) || 0,
          price: Number(form.price) || 0,
          branchStock: BRANCHES.reduce((acc, branchName) => {
            acc[branchName] = Number(form[`stock${branchName}`]) || 0;
            return acc;
          }, {}),
        }),
      });
      appendAuditLog({
        user: user?.email || user?.name || 'admin',
        action: 'create_inventory_item',
        details: `Created product sku=${form.sku} name=${form.name}`,
      });
      onCreated?.(result.product);
      setForm(initialForm);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h3>Add Product</h3>
      <input name="name" value={form.name} onChange={handleChange} placeholder="Product name" />
      <input name="sku" value={form.sku} onChange={handleChange} placeholder="SKU" />
      <input name="brand" value={form.brand} onChange={handleChange} placeholder="Brand" />
      <select name="category" value={form.category} onChange={handleChange}>
        <option value="split">Split</option>
        <option value="window">Window</option>
        <option value="floor">Floor Mounted</option>
      </select>
      <input name="specs" value={form.specs} onChange={handleChange} placeholder="Specs (e.g. 1.5HP)" />
      <input name="features" value={form.features} onChange={handleChange} placeholder="Features (comma separated)" />
      <input
        name={`stock${activeBranch || 'Bulacan'}`}
        value={form[`stock${activeBranch || 'Bulacan'}`]}
        onChange={handleChange}
        placeholder={`${activeBranch || 'Bulacan'} stock`}
        type="number"
      />
      <input name="threshold" value={form.threshold} onChange={handleChange} placeholder="Low-stock threshold (optional)" type="number" />
      <input name="price" value={form.price} onChange={handleChange} placeholder="Price" type="number" />
      <button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button>
      {error && <p style={{ color: '#b91c1c', marginBottom: 0 }}>{error}</p>}
    </form>
  );
};

export default AddProduct;
