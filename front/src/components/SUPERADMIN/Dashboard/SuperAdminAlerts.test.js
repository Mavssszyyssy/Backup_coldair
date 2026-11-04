import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import SuperAdminAlerts from './SuperAdminAlerts';
import { apiRequest } from '../../../config/api';
let currentLanguage = 'English';
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ title, children }) => <div><h1>{title}</h1>{children}</div> }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage }) }));
it('shows transaction, request and maintenance alerts even when order lookup fails', async () => {
  currentLanguage = 'English';
  apiRequest.mockImplementation(async (path) => {
    if (path === '/orders') throw new Error('Order lookup unavailable');
    return { notifications: [
      { id: '1', type: 'payment', title: 'Payment received', branch: 'Cavite' },
      { id: '2', type: 'service', title: 'New service request', branch: 'Cavite' },
      { id: '3', type: 'technician', title: 'Maintenance completed', branch: 'Bulacan' },
    ] };
  });
  render(<MemoryRouter><SuperAdminAlerts /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Operations Alerts' })).toBeInTheDocument();
  await screen.findByText('Payment received');
  expect(screen.getByText('New service request')).toBeInTheDocument();
  expect(screen.getByText('Maintenance completed')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'maintenance' } });
  expect(screen.queryByText('Payment received')).not.toBeInTheDocument();
  expect(screen.getByText('Maintenance completed')).toBeInTheDocument();
});

it('localizes static alert controls while preserving notification text and branch names', async () => {
  currentLanguage = 'Filipino';
  apiRequest.mockImplementation(async (path) => {
    if (path === '/notifications/me?scope=operations') return { notifications: [{ id: '4', type: 'service', title: 'Original service note', message: 'Customer reported a leak', branch: 'Bulacan' }] };
    if (path === '/products/stock-status') return { products: [] };
    return { orders: [] };
  });
  render(<MemoryRouter><SuperAdminAlerts /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Mga Alerto sa Operasyon' })).toBeInTheDocument();
  expect(await screen.findByText('Original service note')).toBeInTheDocument();
  expect(screen.getByText('Customer reported a leak')).toBeInTheDocument();
  expect(screen.getAllByText('Bulacan').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Alisin ang mga salaan' })).toBeInTheDocument();
});

it('pages the complete operations feed and resets to the first page when filters change', async () => {
  currentLanguage = 'English';
  const notifications = Array.from({ length: 23 }, (_, index) => ({
    id: String(index + 1), type: 'service', title: `Alert ${index + 1}`,
    branch: index < 12 ? 'Cavite' : 'Bulacan', createdAt: new Date(2026, 9, 23 - index).toISOString(),
  }));
  apiRequest.mockImplementation(async (path) => {
    if (path === '/notifications/me?scope=operations') return { notifications };
    if (path === '/products/stock-status') return { products: [] };
    return { orders: [] };
  });
  render(<MemoryRouter><SuperAdminAlerts /></MemoryRouter>);
  expect(await screen.findByText('Alert 1')).toBeInTheDocument();
  expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  expect(screen.queryByText('Alert 11')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  expect(screen.getByText('Alert 11')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'Bulacan' } });
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  expect(screen.getByText('Alert 13')).toBeInTheDocument();
  expect(screen.queryByText('Alert 11')).not.toBeInTheDocument();
});

it('shows a readable label for current stock alerts instead of an internal ID', async () => {
  currentLanguage = 'English';
  apiRequest.mockImplementation(async (path) => {
    if (path === '/notifications/me?scope=operations') return { notifications: [] };
    if (path === '/products/stock-status') return { products: [{ id: 'internal-product-id', name: 'Window AC', branchStock: { Bulacan: 2 }, threshold: 3 }] };
    return { orders: [] };
  });
  render(<MemoryRouter><SuperAdminAlerts /></MemoryRouter>);
  expect(await screen.findByText('Low stock: Window AC')).toBeInTheDocument();
  expect(screen.getAllByText('Stock alerts').length).toBeGreaterThan(0);
  expect(screen.queryByText('stock:internal-product-id:Bulacan')).not.toBeInTheDocument();
});
