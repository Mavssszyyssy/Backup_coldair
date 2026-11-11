import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BranchPerformance, DonutChart, SalesTrendChart, ORDER_STAGE_COLORS, formatCurrency, segmentColor } from './CommerceAnalytics';
import { translateText } from '../../utils/customerI18n';

it('shows only the month for a single year and adds the full year for mixed data', () => {
  const { rerender } = render(<SalesTrendChart data={[{ month: '2026-01', sales: 100 }]} />);
  expect(screen.getByText('Jan')).toBeInTheDocument();
  expect(screen.getByTitle(/^Jan 2026:/)).toBeInTheDocument();
  rerender(<SalesTrendChart data={[{ month: '2025-12', sales: 100 }, { month: '2026-01', sales: 100 }]} />);
  expect(screen.getByText('Dec 2025')).toBeInTheDocument();
  expect(screen.getByText('Jan 2026')).toBeInTheDocument();
});

it('keeps cancelled red regardless of segment order and shows counts in a touch-readable legend', () => {
  const data = [
    { key: 'cancelled', label: 'Cancelled', count: 2 },
    { key: 'to_pay', label: 'To pay', count: 4 },
  ];
  expect(segmentColor('Order pipeline', data[0], 0)).toBe(ORDER_STAGE_COLORS.cancelled);
  expect(ORDER_STAGE_COLORS.cancelled).toBe('#b91c1c');
  render(<DonutChart title="Order pipeline" caption="orders" data={data} />);
  expect(screen.getByRole('img', { name: /Cancelled, 2; To pay, 4/ })).toBeInTheDocument();
  expect(screen.getByText('Cancelled').closest('.commerce-legend-item')).toHaveTextContent('2');
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/commerceAnalytics.css'), 'utf8');
  expect(css).toContain('.commerce-kpi--red { color:#b91c1c; }');
  expect(css).toContain('.commerce-kpi--red{color:#f87171}');
});

it('keeps long acquisition labels and exact unknown counts visible', () => {
  render(<DonutChart title="Customer acquisition" caption="customers" data={[{ key: 'unknown', label: 'Unknown / Not Tracked', count: 7 }]} />);
  expect(screen.getByText('Unknown / Not Tracked')).toBeVisible();
  expect(screen.getByText('Unknown / Not Tracked').closest('.commerce-legend-item')).toHaveTextContent('7');
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/commerceAnalytics.css'), 'utf8');
  expect(css).toMatch(/\.commerce-legend-label\s*\{[^}]*overflow-wrap:anywhere/s);
});

it('clarifies that Other describes a recorded signup source, not a customer type', () => {
  render(<DonutChart title="Customer acquisition" caption="customers" data={[{ key: 'other', label: 'Other (recorded)', count: 30 }]} />);
  expect(screen.getByText('Other recorded signup source')).toBeVisible();
  expect(screen.getByRole('img', { name: /Other recorded signup source, 30/ })).toBeInTheDocument();
  expect(screen.queryByText('Other (recorded)')).not.toBeInTheDocument();
});

it('localizes chart labels without changing the order-stage colors', () => {
  const t = (text) => translateText(text, 'Filipino');
  const { container } = render(<DonutChart title={t('Order pipeline')} canonicalTitle="Order pipeline" caption={t('orders')} data={[{ key: 'cancelled', label: 'Cancelled', count: 2 }]} t={t} />);
  expect(screen.getByText(t('Cancelled'))).toBeVisible();
  expect(container.querySelector('.commerce-donut')).toHaveStyle({ background: `conic-gradient(${ORDER_STAGE_COLORS.cancelled} 0% 100%)` });
});

it('shows a reconciled branch total with cancelled orders included', () => {
  render(<BranchPerformance branches={[
    { branch: 'Bulacan', allOrders: 76, orders: 48, cancelledOrders: 28, paidOrders: 35, revenue: 1400 },
    { branch: 'Cavite', allOrders: 64, orders: 44, cancelledOrders: 20, paidOrders: 25, revenue: 1100 },
  ]} />);
  const total = screen.getByRole('rowheader', { name: 'Total' }).closest('tr');
  expect(total).toHaveTextContent('140');
  expect(total).toHaveTextContent('92');
  expect(total).toHaveTextContent('48');
  expect(total).toHaveTextContent('60');
  expect(total).toHaveTextContent('₱2,500');
});

it('toggles the branch control between menu and close states', () => {
  const { container } = render(<BranchPerformance branches={[{ branch: 'Bulacan', orders: 1, paidOrders: 1, revenue: 100, products: [] }]} />);
  const toggle = screen.getByRole('button', { name: /Show Bulacan products in paid orders/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(container.querySelector('.commerce-branch-menu-icon')).not.toHaveClass('is-open');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(container.querySelector('.commerce-branch-menu-icon')).toHaveClass('is-open');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

it('shows centavos so individually rounded peso labels cannot misstate the total', () => {
  expect(formatCurrency(2388762.75)).toBe('₱2,388,762.75');
  expect(formatCurrency(1.4)).toBe('₱1.40');
});

it('sums payment-method revenue in cents so the donut total matches its displayed entries', () => {
  const data = [
    { label: 'GCASH', revenue: 100.25 },
    { label: 'COD', revenue: 200.25 },
    { label: 'CREDIT', revenue: 300.25 },
    { label: 'CARD', revenue: 400.25 },
  ];
  const { container } = render(<DonutChart title="Payment mix" caption="paid revenue" data={data} valueKey="revenue" valueFormatter={formatCurrency} />);
  expect(container.querySelector('.commerce-donut-center')).toHaveTextContent('₱1,001.00');
  expect(container.querySelectorAll('.commerce-legend-item')).toHaveLength(4);
  expect(screen.getByText('GCASH').closest('.commerce-legend-item')).toHaveTextContent('₱100.25');
  expect(screen.getByText('COD').closest('.commerce-legend-item')).toHaveTextContent('₱200.25');
  expect(screen.getByText('CREDIT').closest('.commerce-legend-item')).toHaveTextContent('₱300.25');
  expect(screen.getByText('CARD').closest('.commerce-legend-item')).toHaveTextContent('₱400.25');
});
