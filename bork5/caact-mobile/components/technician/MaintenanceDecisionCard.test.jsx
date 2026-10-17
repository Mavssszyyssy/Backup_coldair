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
  expect(screen.queryByText('Confirm')).toBeNull();
  expect(screen.queryByText('Reject')).toBeNull();
  const savedReview = screen.getByText('Review saved. No further action is required.');
  expect(savedReview.props.accessibilityRole).toBeUndefined();
  expect(savedReview.props.accessibilityLiveRegion).toBe('polite');
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
  reviewTaskDecisionSupport.mockResolvedValue({ success: true, assessment: { status: 'completed', assessment: {
    possible_future_issue: 'Outdoor fan vibration should be monitored.',
    preventive_actions: ['Inspect and clean the fan assembly.'],
  }, review: { decision: 'confirmed' } } });
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
  await act(async () => { fireEvent.press(screen.getByText('Confirm')); });
  const savedReview = await screen.findByText('Review saved. No further action is required.');
  expect(savedReview.props.accessibilityRole).toBeUndefined();
  expect(savedReview.props.accessibilityLiveRegion).toBe('polite');
});

test('long AI lists use explicit See more and See less controls', async () => {
  const onPageChange = jest.fn();
  fetchTaskDecisionSupport.mockResolvedValue({ success: true, preAssessment: { status: 'completed', evidence: [], assessment: {
    possible_problem: 'Inspection needed.',
    safety_flags: ['First', 'Second', 'Third', 'Fourth'],
  }, review: { decision: 'pending' } }, futurePrediction: null });

  await render(<MaintenanceDecisionCard taskId="task-3" requestId="request-3" completed={false} onPageChange={onPageChange} />);
  fireEvent.press(screen.getByRole('button', { name: 'AI parts and future-issue assessment' }));
  await screen.findByText('Inspection needed.');
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Next assessment page' })); });
  expect(onPageChange).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Fourth')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'See more Safety flags' })); });
  expect(await screen.findByText('Fourth')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'See less Safety flags' })); });
  await waitFor(() => expect(screen.queryByText('Fourth')).toBeNull());
});
