import React from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TechProfile from '../app/technician/profile';
import { validateAccountPassword } from '../utils/authValidation';
const mockChange = jest.fn();
const mockUpdate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }), usePathname: () => '/technician/profile' }));
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ current: { id: 'tech-fixture', role: 'technician', alias: 'tech.cavite.test', phone: '09123456789' }, changeMyPassword: mockChange, updateMyAccount: mockUpdate }) }));

test('technician contact editing normalizes formatted numbers, rejects excess digits, and allows retry', async () => {
  mockUpdate.mockReset().mockRejectedValueOnce(new Error('Connection interrupted'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><TechProfile /></SafeAreaProvider>);
  await fireEvent.press(screen.getByLabelText('Edit technician profile'));
  expect(screen.queryByText(/Spaces and dashes are accepted/)).toBeNull();
  expect(screen.getByLabelText('Contact Number').props.maxLength).toBeUndefined();
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '091234567890');
  expect(screen.getByLabelText('Contact Number').props.value).toBe('09123456789');
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '');
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '091234567890');
  expect(screen.getByLabelText('Contact Number').props.value).toBe('');
  await fireEvent.press(screen.getByText('Save Changes'));
  expect(mockUpdate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '+63 912 345 6789');
  await fireEvent.press(screen.getByText('Save Changes'));
  expect(alert).toHaveBeenCalledWith('Not Saved', 'Connection interrupted');
  expect(screen.getByLabelText('Contact Number').props.value).toBe('09123456789');
  mockUpdate.mockResolvedValue({ success: true });
  await fireEvent.press(screen.getByText('Save Changes'));
  expect(mockUpdate).toHaveBeenLastCalledWith({ alias: 'tech.cavite.test', phone: '09123456789' });
  alert.mockRestore();
  mockUpdate.mockReset();
});
test('technician password UI sends current and new password to the dedicated action', async () => {
  mockChange.mockResolvedValue({ success: true });
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><TechProfile /></SafeAreaProvider>);
  expect(screen.queryByText(/authenticator|recovery codes/i)).toBeNull();
  await fireEvent.press(screen.getByText('Change Password'));
  await fireEvent.changeText(screen.getByLabelText('Current Password'), 'OldPass123!');
  await fireEvent.changeText(screen.getByLabelText('New Password'), 'NewPass123!');
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'NewPass123!');
  await fireEvent.press(screen.getByText('Save Changes'));
  await waitFor(() => expect(mockChange).toHaveBeenCalledWith({ currentPassword: 'OldPass123!', newPassword: 'NewPass123!' }));
  expect(mockUpdate).not.toHaveBeenCalled();
});
test('password validation agrees with server rules before submission', () => {
  for (const value of ['LongPassword123', 'onlylowercase!', 'A1!shor', 'Valid123! ', 'Valid123!\n', 'Valid123!\u0000']) expect(validateAccountPassword(value)).not.toBe('');
  expect(validateAccountPassword('StrongPass123!')).toBe('');
  for (const symbol of '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~') expect(validateAccountPassword(`Valid123${symbol}`)).toBe('');
  expect(validateAccountPassword('Abcdef1.')).toBe('');
  expect(validateAccountPassword('A'.repeat(22) + 'a1.')).toBe('');
  expect(validateAccountPassword('A'.repeat(26) + '1!')).not.toBe('');
  expect(validateAccountPassword('lowercase123!')).toContain('uppercase');
  expect(validateAccountPassword('UPPERCASE123!')).toContain('lowercase');
  expect(validateAccountPassword('NoNumbers!')).toContain('number');
  expect(validateAccountPassword('NoSymbol123')).toContain('symbol');
});

test('password fields preserve input, allow visibility checks, and report failed saves without losing it', async () => {
  mockChange.mockReset().mockRejectedValueOnce(new Error('Connection interrupted'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><TechProfile /></SafeAreaProvider>);
  await fireEvent.press(screen.getByText('Change Password'));
  const next = screen.getByLabelText('New Password');
  expect(next.props.autoCapitalize).toBe('none');
  expect(next.props.autoCorrect).toBe(false);
  expect(next.props.maxLength).toBeUndefined(); // report over-length input instead of silently truncating paste
  await fireEvent.changeText(screen.getByLabelText('Current Password'), 'OldPass123!');
  await fireEvent.changeText(next, 'NewPass123.');
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'NewPass123.');
  await fireEvent.press(screen.getByLabelText('Show new password'));
  expect(screen.getByLabelText('New Password').props.secureTextEntry).toBe(false);
  expect(screen.getByLabelText('New Password').props.value).toBe('NewPass123.');
  await fireEvent.press(screen.getByText('Save Changes'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Password not changed', 'Connection interrupted'));
  expect(screen.getByLabelText('New Password').props.value).toBe('NewPass123.');
  mockChange.mockResolvedValue({ success: true });
  await fireEvent.press(screen.getByText('Save Changes'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Password changed', expect.any(String)));
  alert.mockRestore();
});

test('a pending password save cannot be cancelled while the server may still apply it', async () => {
  let finish;
  mockChange.mockReset().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><TechProfile /></SafeAreaProvider>);
  await fireEvent.press(screen.getByText('Change Password'));
  await fireEvent.changeText(screen.getByLabelText('Current Password'), 'OldPass123!');
  await fireEvent.changeText(screen.getByLabelText('New Password'), 'NewPass123!');
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'NewPass123!');
  const pendingSave = fireEvent.press(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(screen.getByLabelText('New Password').props.editable).toBe(false));
  try {
    expect(screen.getByRole('button', { name: 'Cancel' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('New Password').props.editable).toBe(false);
  } finally {
    await act(async () => { finish({ success: false, error: 'Server unavailable' }); });
    await pendingSave;
  }
  expect(screen.getByLabelText('New Password').props.value).toBe('NewPass123!');
  expect(screen.getByRole('button', { name: 'Cancel' }).props.accessibilityState.disabled).toBe(false);
  alert.mockRestore();
});
