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

it('shows the possible next issue from a completed visit without an open request', async () => {
  const futurePrediction = { status: 'completed', generatedAt: '2026-10-12T00:00:00.000Z',
    evidence: [{ id: 'current_findings', label: 'Original findings', text: 'Okay na ang lamig, pero may ingay sa fan.' }],
    assessment: { english_interpretation: 'Cooling is restored, but the fan remains noisy.',
      possible_future_issue: 'The fan noise may need further inspection.', component_to_monitor: 'Fan assembly',
      risk_level: 'medium', confidence: 'limited' } };
  apiRequest.mockResolvedValue({ futurePrediction });
  render(<MaintenanceDecisionSupport request={null} task={{ id: 'task-1', status: 'completed' }} initialPost={futurePrediction} />);
  expect(screen.queryByText('Before maintenance · parts to prepare')).toBeNull();
  expect(screen.getByText('The fan noise may need further inspection.')).toBeVisible();
  fireEvent.click(screen.getByText('Interpretation and supporting details'));
  expect(screen.getAllByText('Okay na ang lamig, pero may ingay sa fan.')[0]).toBeVisible();
  expect(screen.getByText('Cooling is restored, but the fan remains noisy.')).toBeVisible();
});
