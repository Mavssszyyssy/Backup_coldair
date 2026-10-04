import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import ServicePaymentPanel from './ServicePaymentPanel';
import GlobalDialog from '../../common/GlobalDialog';
import { apiRequest } from '../../../config/api';
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('does not invent a price and saves the explicit admin quote', async () => {
  const onUpdated = vi.fn();
  apiRequest.mockResolvedValue({ servicePayment: { amount: 800, status: 'due' } });
  render(<><GlobalDialog /><ServicePaymentPanel request={{ id: 'r1', status: 'In Progress', servicePayment: { status: 'quote_required', amount: null } }} onUpdated={onUpdated} /></>);
  expect(screen.getByText(/Admin quote required/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Base service quote (PHP)'), { target: { value: '800' } });
  fireEvent.click(screen.getByText('Save service quote'));
  await vi.waitFor(() => expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ servicePayment: { amount: 800, status: 'due' } })));
  expect(apiRequest).toHaveBeenCalledWith('/service-requests/r1/quote', expect.objectContaining({ body: JSON.stringify({ amount: '800' }) }));
  expect(await screen.findByRole('heading', { name: 'Service quote saved' })).toBeInTheDocument();
  expect(screen.getByText('The service quote of PHP 800.00 was saved successfully.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
});

it('does not show the success popup when the quote cannot be saved', async () => {
  apiRequest.mockRejectedValue(new Error('Unable to save quote.'));
  render(<><GlobalDialog /><ServicePaymentPanel request={{ id: 'r1', status: 'In Progress', servicePayment: { status: 'quote_required', amount: null } }} onUpdated={vi.fn()} /></>);
  fireEvent.change(screen.getByLabelText('Base service quote (PHP)'), { target: { value: '800' } });
  fireEvent.click(screen.getByText('Save service quote'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save quote.');
  expect(screen.queryByRole('heading', { name: 'Service quote saved' })).not.toBeInTheDocument();
});
it.each(['paid', 'warranty_covered'])('does not allow editing %s service payment', status => {
  render(<ServicePaymentPanel request={{ id: 'r1', servicePayment: { amount: 0, status } }} />);
  expect(screen.queryByText('Save service quote')).toBeNull();
});
