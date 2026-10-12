import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MaintenanceDecisionCard from './MaintenanceDecisionCard';
import { fetchTaskDecisionSupport, generateTaskDecisionSupport, reviewTaskDecisionSupport } from '../../services/taskStorage';

jest.mock('../../services/taskStorage', () => ({
  fetchTaskDecisionSupport: jest.fn(), generateTaskDecisionSupport: jest.fn(), reviewTaskDecisionSupport: jest.fn(),
}));

test('technician sees saved advice and can reject it without changing the visit findings', async () => {
  fetchTaskDecisionSupport.mockResolvedValue({ success: true, preAssessment: { status: 'completed', evidence: [
    { id: 'in_progress_findings', label: 'Saved in-progress technician findings (original wording)', text: 'May ingay sa fan pero hindi pa kumpirmado ang sira.' },
  ], assessment: {
    possible_problem: 'Cooling and fan noise need inspection.', priority: 'medium', confidence: 'limited',
    diagnostic_actions: ['Measure airflow before replacing parts.'],
  }, review: { decision: 'pending' } }, futurePrediction: null });
  reviewTaskDecisionSupport.mockResolvedValue({ success: true, assessment: { status: 'completed', assessment: {
    possible_problem: 'Cooling and fan noise need inspection.', priority: 'medium', confidence: 'limited',
  }, review: { decision: 'rejected' } } });
  await render(<MaintenanceDecisionCard taskId="task-1" requestId="request-1" completed={false} />);
  fireEvent.press(screen.getByRole('button', { name: 'AI parts and future-issue assessment' }));
  expect(await screen.findByText('Cooling and fan noise need inspection.')).toBeTruthy();
  expect(screen.getByText('Original technician observations')).toBeTruthy();
  expect(screen.getByText(/May ingay sa fan pero hindi pa kumpirmado ang sira/)).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Reject')); });
  await waitFor(() => expect(reviewTaskDecisionSupport).toHaveBeenCalledWith('task-1', 'pre', 'rejected'));
  expect(await screen.findByText('rejected')).toBeTruthy();
});

test('completed maintenance allows a separate future-issue assessment', async () => {
  fetchTaskDecisionSupport.mockResolvedValue({ success: true, preAssessment: null, futurePrediction: null });
  generateTaskDecisionSupport.mockResolvedValue({ success: true, futurePrediction: { status: 'completed', assessment: {
    possible_future_issue: 'Outdoor fan vibration should be monitored.', component_to_monitor: 'Outdoor fan',
    risk_level: 'medium', confidence: 'moderate', follow_up: 'Inspect if vibration worsens.',
  } } });
  await render(<MaintenanceDecisionCard taskId="task-2" requestId="request-2" completed />);
  fireEvent.press(screen.getByRole('button', { name: 'AI parts and future-issue assessment' }));
  const generateButton = await screen.findByText('Generate future-issue assessment');
  await act(async () => { fireEvent.press(generateButton); });
  await waitFor(() => expect(generateTaskDecisionSupport).toHaveBeenCalledWith('task-2', 'post'));
  expect(await screen.findByText('Outdoor fan vibration should be monitored.')).toBeTruthy();
});
