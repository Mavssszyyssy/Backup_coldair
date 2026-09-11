import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WarrantyClaims from './WarrantyClaims';

describe('component-specific warranty approval', () => {
  it('requires active component selection and sends the selected component', () => {
    const claim = { unitId: 'unit-1', claimId: 'claim-1', status: 'submitted', unitName: 'Test AC', coverageSummary: '1 year parts, 5 years compressor.', componentCoverage: [{ component: 'Parts', status: 'expired' }, { component: 'Compressor', status: 'active' }] };
    const onReview = vi.fn();
    const { rerender } = render(<WarrantyClaims claims={[claim]} onReview={onReview} />);
    expect(screen.getByRole('region', { name: 'In Warranty Analytics' })).toBeInTheDocument();
    const approve = screen.getByRole('button', { name: 'Approve repair' });
    expect(approve.disabled).toBe(true);
    expect(screen.getByRole('option', { name: 'Parts — expired' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Component covered for claim-1'), { target: { value: 'compressor' } });
    expect(approve.disabled).toBe(false);
    fireEvent.click(approve);
    expect(onReview).toHaveBeenCalledWith(claim, 'approved', 'compressor');
    rerender(<WarrantyClaims claims={[{ ...claim, componentCoverage: claim.componentCoverage.map(item => ({ ...item, status: 'expired' })) }]} onReview={onReview} />);
    expect(approve.disabled).toBe(true);
  });
});
