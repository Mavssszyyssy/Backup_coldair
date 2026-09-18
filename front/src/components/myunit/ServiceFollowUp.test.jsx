import { render, screen } from '@testing-library/react';
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
  expect(screen.getByText('Evidence-based follow-up plan')).toBeVisible();
  expect(screen.getByText('Overall AC performance')).toBeVisible();
  expect(screen.getByText('Recorded component concern')).toBeVisible();
  expect(screen.getByText('Recommended part or component')).toBeVisible();
  expect(screen.getByText('Button panel / affected button')).toBeVisible();
  expect(screen.getByText('Recommended actions', { exact: false })).toBeVisible();
});
