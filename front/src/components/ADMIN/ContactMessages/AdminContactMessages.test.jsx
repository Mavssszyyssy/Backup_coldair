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
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('search=specific+ticket')));
  fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'in_progress' } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('status=in_progress')));
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
