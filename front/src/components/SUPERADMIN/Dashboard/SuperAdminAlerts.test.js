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
    if (path === '/notifications/me') return { notifications: [{ id: '4', type: 'service', title: 'Original service note', message: 'Customer reported a leak', branch: 'Bulacan' }] };
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
