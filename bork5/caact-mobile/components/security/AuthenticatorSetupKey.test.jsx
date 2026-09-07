import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import AuthenticatorSetupKey from './AuthenticatorSetupKey';
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); Clipboard.setStringAsync.mockResolvedValue(true); });

test('copies the exact setup key and explains time-based manual setup', async () => {
  await render(<AuthenticatorSetupKey secret="JBSWY3DPEHPK3PXP" />);
  await fireEvent.press(screen.getByText('Copy setup key'));
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
  expect(await screen.findByText('Setup key copied. Paste it into your authenticator app.')).toBeTruthy();
  expect(screen.getByText(/select Time based/)).toBeTruthy();
});

test('does not copy empty or regenerating keys and resets feedback for a new key', async () => {
  await render(<AuthenticatorSetupKey secret="" />);
  expect(screen.getByText('Copy setup key')).toBeDisabled();
  await screen.rerender(<AuthenticatorSetupKey secret="OLDKEY" />);
  await fireEvent.press(screen.getByText('Copy setup key'));
  await screen.findByText(/Setup key copied/);
  await screen.rerender(<AuthenticatorSetupKey secret="NEWKEY" disabled />);
  expect(screen.queryByText(/Setup key copied/)).toBeNull();
  expect(screen.getByText('Copy setup key')).toBeDisabled();
});

test('clipboard failure offers selectable manual copy without claiming success', async () => {
  Clipboard.setStringAsync.mockRejectedValueOnce(new Error('Unavailable'));
  await render(<AuthenticatorSetupKey secret="TESTKEY" />);
  await fireEvent.press(screen.getByText('Copy setup key'));
  expect(await screen.findByText(/Unable to copy/)).toBeTruthy();
  expect(screen.getByLabelText('Authenticator setup key').props.selectable).toBe(true);
});
