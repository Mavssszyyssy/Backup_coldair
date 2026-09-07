import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import RegisterLocationStep from './RegisterLocationStep';

vi.mock('../../domain/location/addressSelectors', () => ({
  getRegions: () => ['NCR'],
  getProvincesByRegion: () => ['Metro Manila'],
  getCitiesByProvince: () => ['Pasay City'],
  getBarangaysByCity: () => ['Barangay 142'],
}));

it('uses manual location entry and supports skipping without GPS', () => {
  const onNext = vi.fn();
  render(<RegisterLocationStep formData={{ locations: [] }} onFieldChange={vi.fn()} onNext={onNext} onBack={vi.fn()} />);
  expect(screen.queryByText(/sync position|gps auto-capture|facility hub/i)).not.toBeInTheDocument();
  expect(screen.getByPlaceholderText('House No., Building, Street')).not.toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
  expect(onNext).toHaveBeenCalledOnce();
});

it('validates and saves a manually entered location', () => {
  const onFieldChange = vi.fn();
  render(<RegisterLocationStep formData={{ locations: [] }} onFieldChange={onFieldChange} onNext={vi.fn()} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /^save location$/i }));
  expect(screen.getByRole('alert')).toHaveTextContent('City and Street Address are required.');
  const selects = screen.getAllByRole('combobox');
  ['NCR', 'Metro Manila', 'Pasay City', 'Barangay 142'].forEach((value, i) =>
    fireEvent.change(selects[i], { target: { value } }));
  fireEvent.change(screen.getByPlaceholderText('House No., Building, Street'), { target: { value: '539 Test Street' } });
  fireEvent.click(screen.getByRole('button', { name: /^save location$/i }));
  expect(onFieldChange).toHaveBeenCalledWith('locations', [expect.objectContaining({
    source: 'manual',
    address: { region: 'NCR', province: 'Metro Manila', city: 'Pasay City', barangay: 'Barangay 142', street: '539 Test Street' },
    coordinates: expect.objectContaining({ latitude: null, longitude: null }),
  })]);
});
