import { fireEvent, render, screen } from '@testing-library/react';
import ServiceFollowUp from './ServiceFollowUp';

test('shows a component concern separately from normal AC performance', () => {
  render(<ServiceFollowUp interpretation={{
    provider: 'system-fallback',
    customerSummary: 'A recorded button panel concern requires verification.',
    overallCondition: 'The technician recorded normal cooling or operation after the completed service.',
    componentConcern: 'A recorded button panel concern requires verification; this is not a confirmed mechanical diagnosis.',
    recommendedPart: 'Button panel / affected button',
    inventoryMessage: 'No exact replacement part number was recorded.',
    recommendedService: 'inspection',
    recommendedFollowUpDate: '2026-10-02T00:00:00.000Z',
    whyThisDate: 'The recorded concern should be checked soon.',
    recommendedActions: ['Arrange a qualified technician assessment.'],
  }} />);
  expect(screen.getByText('Follow-up based on your service records')).toBeVisible();
  expect(screen.getByText('Overall AC performance')).toBeVisible();
  expect(screen.getByText('Current Issues')).toBeVisible();
  expect(screen.getByText('A recorded button panel concern requires verification; this is not a confirmed mechanical diagnosis.')).toBeVisible();
  expect(screen.getByText('Recommended Part')).toBeVisible();
  expect(screen.getByText('Button panel / affected button')).toBeVisible();
  expect(screen.getByText('Recommended actions', { exact: false })).toBeVisible();
});

test('uses plain language when a structured plan comes from saved service records', () => {
  render(<ServiceFollowUp interpretation={{
    provider: 'system-fallback',
    technicianRecorded: 'The technician recorded a control-panel concern.',
    aiAssessment: 'The saved report recommends checking the control panel.',
  }} />);

  expect(screen.getByText('Based on your service records')).toBeVisible();
  expect(screen.queryByText(/evidence-based fallback/i)).not.toBeInTheDocument();
});

test('renders the complete seven-part AI prescription for a completed visit', () => {
  render(<ServiceFollowUp interpretation={{
    provider: 'openai',
    technicianRecorded: 'The control board did not respond during testing.',
    aiAssessment: 'The symptom may indicate an electrical or control-system issue without confirming board failure.',
    possibleCauses: ['Blown or damaged fuse', 'Loose wiring or connector'],
    diagnosticActions: ['Verify incoming voltage.', 'Inspect the fuse and wiring.'],
    recommendedService: 'inspection',
    recommendedServiceOrRepair: 'Arrange a focused electrical and control-board diagnosis.',
    partsRecommendation: 'Replace the board only if electrical testing confirms it is defective.',
    recommendedFollowUpDate: '2026-10-02T00:00:00.000Z',
    whyThisDate: 'The recorded concern should be checked soon.',
  }} />);
  expect(screen.getByText('1. Technician Findings')).toBeVisible();
  expect(screen.getByText('2. AI Assessment')).toBeVisible();
  expect(screen.getByText('Assessment page 1 of 4')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next assessment page' }));
  expect(screen.getByText('3. Possible Causes')).toBeVisible();
  expect(screen.getByText('4. Recommended Diagnostic Actions')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next assessment page' }));
  expect(screen.getByText('5. Recommended Service / Repair')).toBeVisible();
  expect(screen.getByText('6. Parts / Component Recommendation')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next assessment page' }));
  expect(screen.getByText('7. Suggested Servicing Date')).toBeVisible();
});
