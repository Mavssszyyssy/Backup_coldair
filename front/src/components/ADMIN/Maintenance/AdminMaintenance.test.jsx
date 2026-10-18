import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminMaintenance from './AdminMaintenance';
import { apiRequest } from '../../../config/api';

vi.mock('../Common/AdminLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
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
