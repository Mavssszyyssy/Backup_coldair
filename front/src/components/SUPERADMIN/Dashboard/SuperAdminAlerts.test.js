import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import SuperAdminAlerts from './SuperAdminAlerts';
import { apiRequest } from '../../../config/api';
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
it('shows transaction, request and maintenance alerts even when order lookup fails', async () => {
  apiRequest.mockImplementation(async (path) => {
    if (path === '/orders') throw new Error('Order lookup unavailable');
    return { notifications: [
      { id: '1', type: 'payment', title: 'Payment received', branch: 'Cavite' },
      { id: '2', type: 'service', title: 'New service request', branch: 'Cavite' },
      { id: '3', type: 'technician', title: 'Maintenance completed', branch: 'Bulacan' },
    ] };
  });
  render(<MemoryRouter><SuperAdminAlerts /></MemoryRouter>);
  await screen.findByText('Payment received');
  expect(screen.getByText('New service request')).toBeInTheDocument();
  expect(screen.getByText('Maintenance completed')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'maintenance' } });
  expect(screen.queryByText('Payment received')).not.toBeInTheDocument();
  expect(screen.getByText('Maintenance completed')).toBeInTheDocument();
});
