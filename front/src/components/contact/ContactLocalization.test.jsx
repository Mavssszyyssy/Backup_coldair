import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import ContactForm from './ContactForm';
import ContactHistory from './ContactHistory';

let currentLanguage = 'English';
const apiRequest = vi.fn();
const customer = { name: 'Andrei Tupas', email: 'andrei@example.com' };
vi.mock('../../context/UserContext', () => ({ useUser: () => ({ currentLanguage, user: customer }) }));
vi.mock('../../config/api', () => ({ apiRequest: (...args) => apiRequest(...args) }));
vi.mock('../../domain/emailPolicy', () => ({ validateEmailForSubmission: async () => '' }));

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
  expect(screen.getByText('0/20 salita · 0/160 karakter')).toBeVisible();
  view.unmount();

  currentLanguage = 'English';
  render(<ContactForm />);
  expect(screen.getByRole('heading', { name: 'Send Us a Message' })).toBeInTheDocument();
});

test('contact inquiry validation uses the same code on API, web and mobile', () => {
  const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
  const source = read('../backend/src/domain/contactInquiryValidation.js').replace(/^module\.exports = /m, 'export ');
  expect(read('src/domain/contactInquiryValidation.js')).toBe(source);
  expect(read('../bork5/caact-mobile/utils/contactInquiryValidation.js')).toBe(source);
});

test('contact form blocks filler and over-limit drafts and sends a genuine concern', async () => {
  apiRequest.mockResolvedValue({ message: { ticketCode: 'MSG-QA' } });
  render(<ContactForm />);
  const subject = screen.getByLabelText('Subject *');
  const message = screen.getByLabelText('Message *');
  const form = screen.getByRole('button', { name: 'Send to Support' }).closest('form');

  fireEvent.change(subject, { target: { value: 'Enjdhdhshsh' } });
  fireEvent.change(message, { target: { value: 'Ayaw lumamig.' } });
  fireEvent.submit(form);
  expect(screen.getByRole('alert')).toHaveTextContent(/clear subject/);
  fireEvent.change(subject, { target: { value: 'AC E7' } });
  fireEvent.change(message, { target: { value: 'Lorem ipsum dolor sit amet' } });
  fireEvent.submit(form);
  expect(screen.getByRole('alert')).toHaveTextContent(/placeholder/);

  fireEvent.change(subject, { target: { value: 'AC '.repeat(20) + 'leak' } });
  fireEvent.submit(form);
  expect(screen.getByRole('alert')).toHaveTextContent('Subject must be 20 words or fewer.');
  expect(subject).toHaveAttribute('aria-invalid', 'true');
  expect(apiRequest).not.toHaveBeenCalled();

  fireEvent.change(subject, { target: { value: 'AC E7' } });
  fireEvent.change(message, { target: { value: 'Ayaw lumamig.' } });
  expect(screen.getByText('2/400 words · 13/3000 characters')).toBeVisible();
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(await screen.findByText('MSG-QA')).toBeVisible();
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toMatchObject({ subject: 'AC E7', message: 'Ayaw lumamig.' });
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
