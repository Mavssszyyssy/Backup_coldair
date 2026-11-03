import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import PreferencesSettings from './PreferencesSettings';

test('customer display preferences save and reload from the account record', async () => {
  let savedPreferences;
  const updateSettings = vi.fn(async ({ preferences }) => { savedPreferences = preferences; });
  const initialUser = { preferences: { theme: 'light', language: 'English', timezone: 'Asia/Manila', autoBook: true } };
  const view = render(<PreferencesSettings user={initialUser} onUpdateSettings={updateSettings} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), { target: { value: 'dark' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'Filipino' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Timezone' }), { target: { value: 'UTC' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-booking' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
  await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
  expect(savedPreferences).toEqual({ theme: 'dark', darkMode: true, language: 'Filipino', timezone: 'UTC', autoBook: false });
  view.unmount();
  render(<PreferencesSettings user={{ preferences: savedPreferences }} onUpdateSettings={updateSettings} />);
  expect(screen.getAllByRole('combobox').map((input) => input.value)).toEqual(['dark', 'Filipino', 'UTC']);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});
