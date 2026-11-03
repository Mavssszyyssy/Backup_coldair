import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DonutChart, ORDER_STAGE_COLORS, segmentColor } from './CommerceAnalytics';
import { translateText } from '../../utils/customerI18n';

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

it('localizes chart labels without changing the order-stage colors', () => {
  const t = (text) => translateText(text, 'Filipino');
  const { container } = render(<DonutChart title={t('Order pipeline')} canonicalTitle="Order pipeline" caption={t('orders')} data={[{ key: 'cancelled', label: 'Cancelled', count: 2 }]} t={t} />);
  expect(screen.getByText(t('Cancelled'))).toBeVisible();
  expect(container.querySelector('.commerce-donut')).toHaveStyle({ background: `conic-gradient(${ORDER_STAGE_COLORS.cancelled} 0% 100%)` });
});
