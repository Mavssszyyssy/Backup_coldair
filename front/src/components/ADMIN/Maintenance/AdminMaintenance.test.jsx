import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminMaintenance from './AdminMaintenance';
import { apiRequest } from '../../../config/api';

vi.mock('../Common/AdminLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage: 'English' }) }));
vi.mock('./RequestDetails', () => ({ default: () => null }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));

const claim = { unitId: 'unit-1', claimId: 'claim-1', status: 'submitted', unitName: 'Test AC',
  componentCoverage: [{ component: 'Parts', status: 'active' }] };

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockImplementation(async (path, options) => {
    if (options?.method === 'PATCH') return { claim: { ...claim, status: 'approved' } };
    if (path === '/warranties/claims') return { claims: [claim] };
    if (path === '/service-requests') return { requests: [{ id: 'request-1', status: 'On Hold', unitName: 'Another AC' }] };
    return { users: [] };
  });
});

test('summary cards filter the queue using the same criteria as the counts and keep the dropdown in sync', async () => {
  const fixtures = [
    ['Waiting customer', 'Reviewed'],
    ['Assigned customer', 'Assigned', 'tech-1'],
    ['Active customer', 'In Progress', 'tech-1'],
    ['Held customer', 'On Hold', 'tech-2'],
    ['Served customer', 'Completed'],
    ['Closed customer', 'Cancelled'],
  ];
  apiRequest.mockImplementation(async (path) => path === '/service-requests' ? {
    requests: fixtures.map(([customerName, status, assignedTechnicianId], index) => ({ id: `r-${index}`, customerName, status, assignedTechnicianId })),
  } : {});
  render(<AdminMaintenance embedded />);
  await screen.findByText('Waiting customer');

  const cards = within(screen.getByRole('group', { name: 'Maintenance summary' }));
  const heading = screen.getByRole('heading', { name: 'Requests' });
  const status = screen.getByRole('combobox', { name: 'Status' });
  const cases = [
    [/Needs assignment/, 'unassigned', [0]],
    [/In progress/, 'active', [1, 2]],
    [/On hold/, 'On Hold', [3]],
    [/Completed/, 'Completed', [4]],
    [/Cancelled work/, 'Cancelled', [5]],
    [/All requests/, 'all', [0, 1, 2, 3, 4, 5]],
  ];

  for (const [name, value, matchingIndexes] of cases) {
    const card = cards.getByRole('button', { name });
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(cards.getAllByRole('button', { pressed: true })).toEqual([card]);
    expect(status).toHaveValue(value);
    expect(heading).toHaveFocus();
    fixtures.forEach(([customerName], index) => {
      if (matchingIndexes.includes(index)) expect(screen.getByText(customerName)).toBeVisible();
      else expect(screen.queryByText(customerName)).not.toBeInTheDocument();
    });
  }

  fireEvent.change(status, { target: { value: 'Assigned' } });
  expect(screen.getByText('Assigned customer')).toBeVisible();
  expect(screen.queryByText('Active customer')).not.toBeInTheDocument();
  expect(cards.queryByRole('button', { pressed: true })).not.toBeInTheDocument();

  const search = screen.getByRole('searchbox', { name: 'Search' });
  fireEvent.change(search, { target: { value: 'Active customer' } });
  fireEvent.click(cards.getByRole('button', { name: /All requests/ }));
  expect(search).toHaveValue('Active customer');
  expect(screen.getByText('Active customer')).toBeVisible();
  expect(screen.queryByText('Assigned customer')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(search).toHaveValue('');
  expect(screen.getByText('Assigned customer')).toBeVisible();
});

test('shows on-hold work separately and saves a claim decision in an in-page dialog', async () => {
  const prompt = vi.spyOn(window, 'prompt');
  try {
    render(<AdminMaintenance embedded />);
    expect(await screen.findByText('1 open')).toBeInTheDocument();
    expect(screen.getByText('Admin follow-up needed').previousSibling).toHaveTextContent('1');
    fireEvent.change(screen.getByLabelText('Component covered for claim-1'), { target: { value: 'parts' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve repair' }));
    expect(screen.getByRole('dialog', { name: 'Approve repair' })).toBeInTheDocument();
    expect(prompt).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Decision note/), { target: { value: 'Verified coverage.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      '/warranties/units/unit-1/claims/claim-1',
      expect.objectContaining({ body: JSON.stringify({ status: 'approved', decisionNote: 'Verified coverage.', coveredComponent: 'parts' }) }),
    ));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  } finally { prompt.mockRestore(); }
});
