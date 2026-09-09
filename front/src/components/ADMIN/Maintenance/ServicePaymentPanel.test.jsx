import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import ServicePaymentPanel from './ServicePaymentPanel';
import { apiRequest } from '../../../config/api';
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('does not invent a price and saves the explicit admin quote', async () => {
  const onUpdated = vi.fn();
  apiRequest.mockResolvedValue({ servicePayment: { amount: 800, status: 'due' } });
  render(<ServicePaymentPanel request={{ id: 'r1', status: 'In Progress', servicePayment: { status: 'quote_required', amount: null } }} onUpdated={onUpdated} />);
  expect(screen.getByText(/Admin quote required/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Final service quote (PHP)'), { target: { value: '800' } });
  fireEvent.click(screen.getByText('Save service quote'));
  await vi.waitFor(() => expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ servicePayment: { amount: 800, status: 'due' } })));
  expect(apiRequest).toHaveBeenCalledWith('/service-requests/r1/quote', expect.objectContaining({ body: JSON.stringify({ amount: '800' }) }));
});
it.each(['paid', 'warranty_covered'])('does not allow editing %s service payment', status => {
  render(<ServicePaymentPanel request={{ id: 'r1', servicePayment: { amount: 0, status } }} />);
  expect(screen.queryByText('Save service quote')).toBeNull();
});
