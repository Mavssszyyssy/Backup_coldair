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
  expect(screen.getByText('Assessment page 1 of 3')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Next assessment page' })); });
  expect(screen.getByText('Original technician observations')).toBeTruthy();
  expect(screen.getByText(/May ingay sa fan pero hindi pa kumpirmado ang sira/)).toBeTruthy();
  expect(screen.getByText('Assessment page 2 of 3')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Next assessment page' })); });
  expect(screen.getByText('Assessment page 3 of 3')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Reject')); });
  await waitFor(() => expect(reviewTaskDecisionSupport).toHaveBeenCalledWith('task-1', 'pre', 'rejected'));
  expect(await screen.findByText('rejected')).toBeTruthy();
});

test('completed maintenance allows a separate future-issue assessment', async () => {
  fetchTaskDecisionSupport.mockResolvedValue({ success: true, preAssessment: null, futurePrediction: null });
  generateTaskDecisionSupport.mockResolvedValue({ success: true, futurePrediction: { status: 'completed', evidence: [
    { id: 'current_findings', text: 'May alikabok sa evaporator coil at biglang huminto ang motor.' },
  ], assessment: {
    possible_future_issue: 'Outdoor fan vibration should be monitored.', component_to_monitor: 'Outdoor fan',
    risk_level: 'medium', confidence: 'moderate', follow_up: 'Inspect if vibration worsens.',
    english_interpretation: 'The evaporator coil had dust buildup and the motor suddenly stopped.',
    supporting_findings: ['The motor stopped during the visit.'],
    missing_evidence: ['Motor test readings were not recorded.'],
    preventive_actions: ['Inspect and clean the fan assembly.'],
  } } });
  await render(<MaintenanceDecisionCard taskId="task-2" requestId="request-2" completed />);
  fireEvent.press(screen.getByRole('button', { name: 'AI parts and future-issue assessment' }));
  const generateButton = await screen.findByText('Generate future-issue assessment');
  await act(async () => { fireEvent.press(generateButton); });
  await waitFor(() => expect(generateTaskDecisionSupport).toHaveBeenCalledWith('task-2', 'post'));
  expect(await screen.findByText('Outdoor fan vibration should be monitored.')).toBeTruthy();
  expect(screen.getByText('Assessment page 1 of 4')).toBeTruthy();
  expect(screen.queryByText('Original technician findings')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Next assessment page' })); });
  expect(screen.getByText('Original technician findings')).toBeTruthy();
  expect(screen.getByText(/May alikabok sa evaporator coil/)).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Next assessment page' })); });
  expect(screen.getByText('Supporting findings')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Next assessment page' })); });
  expect(screen.getByText('Preventive actions')).toBeTruthy();
  expect(screen.getByText('Assessment page 4 of 4')).toBeTruthy();
});
