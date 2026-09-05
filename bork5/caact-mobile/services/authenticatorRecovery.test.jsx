import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AuthenticatorRecoveryScreen from '../components/security/AuthenticatorRecoveryScreen';
const mockEnsure = jest.fn();
const mockVerify = jest.fn();
const mockReplace = jest.fn();
const mockLogout = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ current: { role: 'technician', alias: 'qa-technician' }, verifySecuritySetup: mockVerify, resolveHomeRoute: () => '/technician/home', logout: mockLogout }) }));
jest.mock('./customerSecurityService', () => ({ ensureCustomerTotpSecret: () => mockEnsure(), regenerateCustomerTotpSecret: () => mockEnsure() }));
jest.mock('../components/ui/QrCodeMatrix', () => () => { const { Text } = require('react-native'); return <Text>Authenticator QR</Text>; });
beforeEach(() => { jest.clearAllMocks(); mockEnsure.mockResolvedValue('QA-SETUP-KEY'); });
test('release-mode recovery displays both QR and manual setup instructions', async () => {
  const development = global.__DEV__; global.__DEV__ = false;
  try {
    await render(<AuthenticatorRecoveryScreen />);
    await screen.findByText('QA-SETUP-KEY');
    expect(screen.getByText('Authenticator QR')).toBeTruthy();
    mockVerify.mockResolvedValue({ success: true, user: { role: 'technician' } });
    await fireEvent.changeText(screen.getByLabelText('Authenticator Code'), '123456');
    await fireEvent.press(screen.getByText('Verify Authenticator Code'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/technician/home'));
  } finally { global.__DEV__ = development; }
});
test('setup network failures show retry and never permit empty-secret verification', async () => {
  mockEnsure.mockRejectedValueOnce(new Error('QA connection unavailable'));
  await render(<AuthenticatorRecoveryScreen />);
  await screen.findByText('QA connection unavailable');
  expect(screen.getByText('Verify Authenticator Code')).toBeDisabled();
  await fireEvent.press(screen.getByText('Retry setup'));
  await screen.findByText('QA-SETUP-KEY');
  expect(screen.getByText('Verify Authenticator Code')).not.toBeDisabled();
});
