import { describe, expect, it } from 'vitest';
import { dashboardFilterQuery, validateDashboardDates } from './dashboardFilters';
import { sortInventoryProducts } from './inventorySort';
import { serviceRequestSummary } from './serviceRequestSummary';
import { currentStockAlerts } from './stockAlerts';
import { alertCategory } from './operationalAlerts';

describe('Phase 3 dashboard filters', () => {
  it('combines branch and custom dates and preserves the all-branch default', () => {
    expect(dashboardFilterQuery({ branch: 'New Branch', from: '2026-10-01', to: '2026-10-15' })).toBe('/dashboard/me?branch=New+Branch&from=2026-10-01&to=2026-10-15');
    expect(dashboardFilterQuery({ branch: 'all' })).toBe('/dashboard/me');
  });
  it('rejects incomplete, inverted, invalid, and future ranges', () => {
    expect(validateDashboardDates('2026-10-01', '2026-10-15', '2026-10-27')).toBe('');
    for (const [from, to] of [['', '2026-10-15'], ['2026-10-20', '2026-10-15'], ['2026-02-30', '2026-10-15'], ['2099-01-01', '2099-01-02']]) {
      expect(validateDashboardDates(from, to, '2026-10-27')).not.toBe('');
    }
  });
});

describe('Phase 3 inventory sorting', () => {
  const products = [{ name: 'Zephyr', sku: 'z' }, { name: 'Alpha', sku: '2' }, { name: 'alpha', sku: '1' }, { name: 'Mid', sku: 'm' }];
  it('sorts the whole filtered collection with deterministic name ties', () => {
    expect(sortInventoryProducts(products, 'name-asc').map((item) => item.sku)).toEqual(['1', '2', 'm', 'z']);
    expect(sortInventoryProducts(products, 'name-desc').map((item) => item.sku)).toEqual(['z', 'm', '1', '2']);
    expect(sortInventoryProducts(products.filter((item) => item.name.toLowerCase().includes('a')), 'name-asc').map((item) => item.sku)).toEqual(['1', '2']);
    expect(products[0].sku).toBe('z');
  });
});

describe('Phase 3 cancelled work and stock conditions', () => {
  it('counts each branch-scoped cancelled request once without treating it as unassigned', () => {
    expect(serviceRequestSummary([{ status: 'Cancelled' }, { status: 'Cancelled' }, { status: 'In Progress', assignedTechnicianId: 'tech-1' }, { status: 'Completed' }])).toEqual({ total: 4, unassigned: 0, active: 1, onHold: 0, completed: 1, cancelled: 2 });
  });
  it('uses branch thresholds, deduplicates unchanged conditions, and clears replenished stock', () => {
    const product = { id: 'p1', name: 'AC', threshold: 2, branchThresholds: { Bulacan: 3 }, branchStock: { Bulacan: 2, Cavite: 0 } };
    const alerts = currentStockAlerts([product], '2026-10-27T00:00:00.000Z');
    expect(alerts).toHaveLength(2);
    expect(alerts[0].id).toBe('stock:p1:Bulacan');
    expect(alerts[0].title).toContain('Low stock');
    expect(alerts[1].title).toContain('Out of stock');
    expect(alertCategory(alerts[0])).toBe('stock');
    expect(alertCategory({ type: 'inventory', category: 'audit', targetType: 'inventory', title: 'Inventory change approved' })).toBe('other');
    expect(alertCategory({ type: 'message', category: 'other' })).toBe('other');
    expect(currentStockAlerts([{ ...product, branchStock: { Bulacan: 4, Cavite: 3 } }])).toEqual([]);
  });
});
