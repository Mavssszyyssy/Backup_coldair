import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ReceiptView from './ReceiptView';
import { apiRequest } from '../../config/api';
const session = vi.hoisted(() => ({ user: { role: 'admin' } }));
vi.mock('../../context/UserContext', () => ({ useUser: () => session }));
vi.mock('../../config/api', () => ({ apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<MemoryRouter initialEntries={['/receipt/order1']}><Routes><Route path="/receipt/:orderId" element={<ReceiptView />} /></Routes></MemoryRouter>);
for (const role of ['admin', 'superadmin', 'customer']) it(role + ' reads a receipt using the correct endpoint without claiming unpaid COD was paid', async () => {
  session.user = { role };
  apiRequest.mockResolvedValue({ order: { id: 'order1', receiptAvailable: true, paymentMethod: 'cod', status: 'paid', workflowStatus: 'to_install', totalAmount: 100, receipt: { receiptNumber: 'RCP-1' } } });
  mount();
  await screen.findByText('Amount Due');
  expect(screen.getByText('Payment due on delivery')).toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith(role === 'customer' ? '/orders/me/order1' : '/orders/order1');
  expect(screen.queryByText('Total Paid')).not.toBeInTheDocument();
});
it('shows paid COD only with recorded collection', async () => {
  session.user = { role: 'admin' };
  apiRequest.mockResolvedValue({ order: { id: 'order1', receiptAvailable: true, paymentMethod: 'cod', totalAmount: 100, codCollection: { collectedAt: '2026-09-08' }, receipt: { receiptNumber: 'RCP-1' } } });
  mount();
  await screen.findByText('Total Paid');
  expect(screen.getByText('Paid on delivery')).toBeInTheDocument();
});

it.each([['gcash', 'GCash'], ['credit', 'Credit / debit card']])('shows the actual %s method and Cold Air logo, not the processor', async (method, label) => {
  session.user = { role: 'customer' };
  apiRequest.mockResolvedValue({ order: { id: 'order1', receiptAvailable: true, paymentMethod: method, paymentProvider: 'paymongo', paymentStatus: 'paid', totalAmount: 100, receipt: { receiptNumber: 'RCP-1' } } });
  mount();
  expect(await screen.findByText(label)).toBeInTheDocument();
  expect(screen.getByAltText('Cold Air logo')).toHaveAttribute('src', '/Cold%20Air%20Logo.jpg');
  expect(screen.queryByText(/via PayMongo/i)).not.toBeInTheDocument();
});
