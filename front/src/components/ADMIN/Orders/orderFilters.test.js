import { describe, expect, test } from 'vitest';
import {
  collectOrderBranches,
  countActiveOrderFilters,
  filterCustomerOrders,
  getOrderPaymentFilterKey,
} from './orderFilters';

const orders = [
  {
    id: '1',
    orderCode: 'ORD-BUL-001',
    customerName: 'Ana Reyes',
    customerBranch: 'Bulacan',
    stockSourceBranch: 'Bulacan',
    workflowStatus: 'to_dispatch',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    createdAt: '2026-10-13T01:00:00.000Z',
    address: { phone: '09171234567', city: 'Malolos' },
    items: [{ name: 'LG Dual Inverter', sku: 'LG-15HP', serialNumbers: ['LG0001'] }],
  },
  {
    id: '2',
    orderCode: 'ORD-CAV-002',
    customerName: 'Ben Santos',
    stockSourceBranch: 'Cavite',
    workflowStatus: 'complete',
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    createdAt: '2026-09-01T01:00:00.000Z',
    items: [{ name: 'Samsung WindFree', sku: 'SAM-20HP' }],
  },
];

describe('customer order filters', () => {
  test('searches useful customer, product, contact, and serial fields', () => {
    expect(filterCustomerOrders(orders, { search: '09171234567' })).toEqual([orders[0]]);
    expect(filterCustomerOrders(orders, { search: 'LG0001' })).toEqual([orders[0]]);
    expect(filterCustomerOrders(orders, { search: 'samsung' })).toEqual([orders[1]]);
  });

  test('combines workflow, payment, branch, and date filters', () => {
    const result = filterCustomerOrders(orders, {
      workflow: 'to_dispatch',
      payment: 'due',
      branch: 'Bulacan',
      dateRange: 'today',
    }, new Date('2026-10-13T12:00:00+08:00'));
    expect(result).toEqual([orders[0]]);
  });

  test('normalizes payment state and exposes distinct branch choices', () => {
    expect(getOrderPaymentFilterKey(orders[0])).toBe('due');
    expect(getOrderPaymentFilterKey(orders[1])).toBe('paid');
    expect(collectOrderBranches(orders)).toEqual(['Bulacan', 'Cavite']);
    expect(countActiveOrderFilters({ search: 'Ana', workflow: 'complete', payment: 'all', queue: 'refund_review' })).toBe(3);
  });
});
