import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WarrantyClaimDetails from '../components/customer/WarrantyClaimDetails';

test('customer can read branch decisions and cancellation reasons', async () => {
  await render(<WarrantyClaimDetails claim={{ claimId: 'CL-1', status: 'cancelled', issue: 'No cooling', decisionNote: 'Control board repair approved', reviewedAt: '2026-09-07', coveredComponent: 'parts', cancellationReason: 'Customer requested cancellation' }} formatDate={value => value} />);
  for (const text of ['CL-1 · cancelled', 'Control board repair approved', '2026-09-07', 'parts', 'Customer requested cancellation']) expect(screen.getByText(text)).toBeTruthy();
});

test('unreviewed claims do not invent branch decisions', async () => {
  await render(<WarrantyClaimDetails claim={{ claimId: 'CL-2', status: 'submitted' }} formatDate={value => value} />);
  expect(screen.queryByText('Branch decision')).toBeNull();
  expect(screen.queryByText('Approved component')).toBeNull();
});
