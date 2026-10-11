import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import MaintenanceDecisionSupport from './MaintenanceDecisionSupport';

vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it('generates and displays a pre-visit assessment without replacing the reported issue', async () => {
  const request = { id: 'request-1', status: 'Submitted', issue: 'Hindi lumalamig' };
  apiRequest.mockResolvedValue({ preAssessment: { status: 'completed', generatedAt: '2026-10-01', review: { decision: 'pending' },
    assessment: { possible_problem: 'Cooling and airflow need inspection.', priority: 'medium', confidence: 'limited',
      parts_to_bring: [{ name: 'Filter sample', reason: 'Confirm fit' }], replace_only_after_diagnosis: [{ name: 'Fan', only_if: 'Confirmed faulty' }],
      diagnostic_actions: ['Measure airflow first.'] } } });
  render(<MaintenanceDecisionSupport request={request} task={null} />);
  fireEvent.click(screen.getByRole('button', { name: 'Generate AI assessment' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/amp/requests/request-1/pre-assessment', { method: 'POST' }));
  expect(await screen.findByText('Cooling and airflow need inspection.')).toBeVisible();
  expect(screen.getByText(/Fan — Confirmed faulty/)).toBeVisible();
  expect(request.issue).toBe('Hindi lumalamig');
});

it('shows an AI failure clearly and never fabricates a saved prediction', async () => {
  apiRequest.mockRejectedValue(new Error('AI assessment is unavailable right now.'));
  render(<MaintenanceDecisionSupport request={{ id: 'request-2', status: 'Submitted' }} task={null} />);
  fireEvent.click(screen.getByRole('button', { name: 'Generate AI assessment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('AI assessment is unavailable right now.');
  expect(screen.queryByText('Possible future issue')).toBeNull();
});
