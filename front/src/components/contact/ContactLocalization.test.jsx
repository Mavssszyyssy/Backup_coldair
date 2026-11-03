import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import ContactForm from './ContactForm';
import ContactHistory from './ContactHistory';

let currentLanguage = 'English';
const apiRequest = vi.fn();
const customer = { name: 'Andrei Tupas', email: 'andrei@example.com' };
vi.mock('../../context/UserContext', () => ({ useUser: () => ({ currentLanguage, user: customer }) }));
vi.mock('../../config/api', () => ({ apiRequest: (...args) => apiRequest(...args) }));

beforeEach(() => {
  currentLanguage = 'English';
  apiRequest.mockReset();
});

test('contact form labels switch languages while the customer name stays unchanged', () => {
  currentLanguage = 'Filipino';
  const view = render(<ContactForm />);
  expect(screen.getByRole('heading', { name: 'Magpadala sa Amin ng Mensahe' })).toBeInTheDocument();
  expect(screen.getByLabelText('Iyong Pangalan *')).toHaveValue('Andrei Tupas');
  expect(screen.getByRole('button', { name: 'Ipadala sa Suporta' })).toBeInTheDocument();
  view.unmount();

  currentLanguage = 'English';
  render(<ContactForm />);
  expect(screen.getByRole('heading', { name: 'Send Us a Message' })).toBeInTheDocument();
});

test('support history localizes status and controls while preserving messages', async () => {
  currentLanguage = 'Filipino';
  apiRequest.mockResolvedValue({ messages: [{
    id: 'message-1', ticketCode: 'SUP-123', status: 'resolved',
    subject: 'Aircon stopped cooling', message: 'Original customer message',
    adminReply: 'Original branch reply', createdAt: '2026-10-29T00:00:00.000Z',
  }] });
  render(<ContactHistory />);
  expect(await screen.findByText('Aircon stopped cooling')).toBeInTheDocument();
  expect(screen.getByText('Original customer message')).toBeInTheDocument();
  expect(screen.getByText('Original branch reply')).toBeInTheDocument();
  expect(screen.getByText(/SUP-123 · Nalutas/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Aking Mga Mensahe sa Suporta' })).toBeInTheDocument();
});
