import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import RegisterLocationStep from './RegisterLocationStep';
import { captureSignupPosition } from '../../domain/location/signupGps';
vi.mock('../../domain/location/signupGps', () => ({ captureSignupPosition: vi.fn() }));
const renderStep = () => render(<RegisterLocationStep formData={{ locations: [] }} onFieldChange={vi.fn()} onNext={vi.fn()} onBack={vi.fn()} />);
it('finishes the spinner and explains coordinate-only capture', async () => {
  captureSignupPosition.mockResolvedValue({ coordinates: { latitude: 14.5, longitude: 121 }, source: 'gps', address: null, message: 'GPS position saved. Select your address below.' });
  renderStep();
  fireEvent.click(screen.getByRole('button', { name: /sync position/i }));
  await screen.findByText('GPS position saved. Select your address below.');
  expect(screen.getByRole('button', { name: /sync position/i })).not.toBeDisabled();
});
it('finishes the spinner after a denied permission and keeps manual entry available', async () => {
  captureSignupPosition.mockRejectedValue(new Error('Allow location access in your browser settings, then try again.'));
  renderStep();
  fireEvent.click(screen.getByRole('button', { name: /sync position/i }));
  await screen.findByText(/allow location access/i);
  expect(screen.getByRole('button', { name: /sync position/i })).not.toBeDisabled();
  expect(screen.getByPlaceholderText('House No., Building, Street')).not.toBeDisabled();
});
