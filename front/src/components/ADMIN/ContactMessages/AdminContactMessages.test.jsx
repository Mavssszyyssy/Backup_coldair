import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { apiRequest } from '../../../config/api';
import AdminContactMessages from './AdminContactMessages';

vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
let language = 'English';
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage: language }) }));

beforeEach(() => { language = 'English'; apiRequest.mockReset(); });

test('inbox uses backend-filtered results and server counts rather than counting one page', async () => {
  apiRequest.mockResolvedValue({
    messages: [{ id: 'active-1', ticketCode: 'MSG-1', customerName: 'Active Customer', subject: 'Help', message: 'A real concern', status: 'new' }],
    counts: { total: 43, new: 9, active: 12, resolved: 22 },
    pagination: { page: 1, limit: 20, total: 43, pages: 3 },
  });
  render(<AdminContactMessages />);
  expect(await screen.findByText('Active Customer · MSG-1')).toBeInTheDocument();
  expect(screen.getByText('43')).toBeInTheDocument();
  expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search messages' }), { target: { value: 'specific ticket' } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('search=specific+ticket'), expect.objectContaining({ onCached: expect.any(Function) })));
  fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'in_progress' } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('status=in_progress'), expect.objectContaining({ onCached: expect.any(Function) })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith(
    expect.stringContaining('status=in_progress'), { fresh: true },
  ));
});

test('Filipino inbox keeps the original customer message and subject', async () => {
  language = 'Filipino';
  apiRequest.mockResolvedValue({ messages: [{ id: 'm-1', ticketCode: 'MSG-1', customerName: 'Ana Santos', subject: 'Need help', message: 'Original customer message', status: 'new' }], counts: { total: 1, new: 1, active: 0, resolved: 0 } });
  render(<AdminContactMessages />);
  expect(await screen.findByText('Mga bagong mensahe')).toBeInTheDocument();
  expect(screen.getAllByText('Need help').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Original customer message').length).toBeGreaterThan(0);
  expect(screen.getByRole('searchbox', { name: 'Maghanap ng mensahe' })).toBeInTheDocument();
});

test('staff replies reject gibberish and excessive words, then send clear Taglish text', async () => {
  const item = { id: 'm-1', ticketCode: 'MSG-1', customerName: 'Ana Cruz', subject: 'Need help', message: 'My AC is not cooling.', status: 'new' };
  apiRequest.mockImplementation(async (_path, options) => options?.method === 'PATCH'
    ? { message: { ...item, adminReply: 'Salamat po, ipapa-check namin ang unit bukas.', status: 'in_progress' } }
    : { messages: [item] });
  render(<AdminContactMessages />);
  const input = await screen.findByRole('textbox', { name: 'Reply to customer' });
  const send = screen.getByRole('button', { name: 'Send Reply' });
  expect(input).toHaveAttribute('maxLength', '1000');
  for (const text of ['jhjhjh', 'help jshshshshshsh', 'Lorem ipsum dolor sit amet', 'May tagas '.repeat(75) + 'po']) {
    fireEvent.change(input, { target: { value: text } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(send).toBeDisabled();
    fireEvent.click(send);
  }
  expect(apiRequest.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
  fireEvent.change(input, { target: { value: 'Salamat po, ipapa-check namin ang unit bukas.' } });
  expect(input).toHaveAttribute('aria-invalid', 'false');
  expect(send).toBeEnabled();
  fireEvent.click(send);
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/contact-messages/m-1', {
    method: 'PATCH', body: JSON.stringify({ adminReply: 'Salamat po, ipapa-check namin ang unit bukas.', status: 'in_progress' }),
  }));
  await waitFor(() => expect(input).toHaveValue(''));
});

test('long historical text can be expanded and collapses when switching tickets', async () => {
  const long = 'Older customer concern with details. '.repeat(40);
  apiRequest.mockResolvedValue({ messages: [
    { id: 'm-1', ticketCode: 'MSG-1', customerName: 'Ana Cruz', subject: 'Older concern', message: long, status: 'new' },
    { id: 'm-2', ticketCode: 'MSG-2', customerName: 'Ben Cruz', subject: 'Second concern', message: long, status: 'new' },
  ] });
  render(<AdminContactMessages />);
  const expand = await screen.findByRole('button', { name: 'Show full message' });
  expect(expand).toHaveAttribute('aria-expanded', 'false');
  const text = document.getElementById(expand.getAttribute('aria-controls'));
  expect(text.textContent).toBe(long);
  expect(text).toHaveClass('is-collapsed');
  fireEvent.click(expand);
  expect(text).toHaveClass('is-expanded');
  fireEvent.click(screen.getByRole('button', { name: /Second concern/ }));
  expect(screen.getByRole('button', { name: 'Show full message' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('textbox', { name: 'Reply to customer' })).toBeEnabled();
});
