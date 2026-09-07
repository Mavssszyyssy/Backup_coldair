import React from 'react';
import { Text } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { screen, fireEvent } from '@testing-library/react-native';
import RootLayout from '../app/_layout';
import CustomerLayout from '../app/customer/_layout';
import CustomerOobe from '../app/customer/oobe/index';
import * as api from './api';
import * as Notifications from 'expo-notifications';

jest.mock('../components/BackendConnectionStatus', () => () => null);
jest.mock('../components/ui/BottomNav', () => () => null);
jest.mock('../components/ui/QrCodeMatrix', () => () => { const { Text } = require('react-native'); return <Text>QR setup fixture</Text>; });
jest.mock('./sessionCache', () => ({ clearOperationalSessionCache: jest.fn().mockResolvedValue() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue('fixture-token'), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(), getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }), requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null), clearLastNotificationResponseAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('./api', () => ({ me: jest.fn(), verifyTotpSetup: jest.fn(), updateProfile: jest.fn(), getStoredToken: jest.fn().mockResolvedValue('fixture-token'), fetchSecurityStatus: jest.fn(), fetchRecoveryCodes: jest.fn(), fetchTotpSecret: jest.fn() }));

test('customer can enable authenticator and finish setup with the real root providers without a navigation loop', async () => {
  const customer = { id: 'customer-fixture', role: 'customer', email: 'customer@example.com', security: { totpEnabled: false } };
  api.me.mockResolvedValue({ success: true, user: customer });
  api.fetchSecurityStatus.mockResolvedValue({ success: true, security: { totpEnabled: false } });
  api.fetchRecoveryCodes.mockResolvedValue({ success: true, security: { recoveryCodesConfigured: true } });
  api.fetchTotpSecret.mockResolvedValue({ success: true, secret: 'TESTSETUPKEY' });
  api.verifyTotpSetup.mockImplementation(async () => {
    const user = { ...customer, security: { totpEnabled: true } };
    api.fetchSecurityStatus.mockResolvedValue({ success: true, security: user.security });
    return { success: true, token: 'verified-token', user };
  });
  api.updateProfile.mockResolvedValue({ success: true, user: { ...customer, security: { totpEnabled: true }, customerOnboardedAt: '2026-09-08' } });
  await renderRouter({ _layout: RootLayout, 'customer/_layout': CustomerLayout,
    'customer/oobe/index': CustomerOobe, 'customer/home': () => <Text>Customer home fixture</Text>,
  }, { initialUrl: '/customer/oobe' });
  await screen.findByText('TESTSETUPKEY');
  expect(Notifications.getLastNotificationResponseAsync).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Six-digit authenticator code'), '123456');
  await fireEvent.press(screen.getByText('Verify Authenticator'));
  await screen.findByText('Your authenticator app is verified and will be required at sign-in.');
  await fireEvent.press(screen.getByText('Continue to Home'));
  await screen.findByText('Customer home fixture');
});
