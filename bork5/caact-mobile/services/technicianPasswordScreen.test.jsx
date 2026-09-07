import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TechProfile from '../app/technician/profile';
import { validateAccountPassword } from '../utils/authValidation';
const mockChange = jest.fn();
const mockUpdate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }), usePathname: () => '/technician/profile' }));
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ current: { id: 'tech-fixture', role: 'technician', alias: 'tech.cavite.test', phone: '09123456789' }, changeMyPassword: mockChange, updateMyAccount: mockUpdate }) }));
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
  for (const value of ['LongPassword123', 'StrongPass123.', 'onlylowercase!', 'A1!shor']) expect(validateAccountPassword(value)).not.toBe('');
  expect(validateAccountPassword('StrongPass123!')).toBe('');
  expect(validateAccountPassword('A'.repeat(26) + '1!')).not.toBe('');
});
