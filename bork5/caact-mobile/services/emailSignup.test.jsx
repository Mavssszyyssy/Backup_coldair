import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SignUpStep2 from '../app/(auth)/sign-up/step/2';
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from './legalConsent';
const mockRequest = jest.fn();
const mockVerify = jest.fn();
const mockRegister = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn() }), useLocalSearchParams: () => ({ email: 'customer@example.com', name_first: 'Test', name_last: 'Customer', password: 'StrongPass1!' }) }));
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ register: mockRegister }) }));
jest.mock('./api', () => ({ requestVerificationOtp: (...args) => mockRequest(...args), verifyRegistrationOtp: (...args) => mockVerify(...args) }));
beforeEach(() => jest.clearAllMocks());

const renderSignup = () => render(
  <SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
  }}>
    <SignUpStep2 />
  </SafeAreaProvider>,
);

test('signup verifies email and completes registration after skipping the address', async () => {
  mockRequest.mockResolvedValue({ success: true });
  mockVerify.mockResolvedValue({ success: true, registrationVerificationToken: 'email-proof' });
  mockRegister.mockResolvedValue({ success: true });
  await renderSignup();
  expect(screen.queryByText(/SMS/)).toBeNull();
  for (const doc of LEGAL_DOCUMENTS) await fireEvent.press(screen.getByLabelText(doc.action));
  await fireEvent.press(screen.getByText('Send Verification Code'));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ action: 'register_email', channel: 'email', email: 'customer@example.com', phone: '' })));
  await fireEvent.changeText(screen.getByPlaceholderText('Enter 6-digit code'), '123456');
  await fireEvent.press(screen.getByLabelText('Read App Terms & Conditions'));
  await fireEvent.press(screen.getByLabelText('Back to signup'));
  expect(screen.getByPlaceholderText('Enter 6-digit code').props.value).toBe('123456');
  expect(screen.getByLabelText(LEGAL_DOCUMENTS[0].action).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByText('Complete Registration'));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ contact_method: 'email', locations: [], registrationVerificationToken: 'email-proof', legalConsent: { app: true, service: true, warranty: true, privacy: true, version: LEGAL_VERSION } })));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/customer/oobe', params: { registered: '1' } });
});
test('missing acceptance blocks sending and registration; revoking acceptance blocks completion', async () => {
  mockRequest.mockResolvedValue({ success: true });
  await renderSignup();
  await fireEvent.press(screen.getByText('Send Verification Code'));
  expect(mockRequest).not.toHaveBeenCalled();
  expect(screen.getByText(/4 remaining required/)).toBeTruthy();
  for (const doc of LEGAL_DOCUMENTS) await fireEvent.press(screen.getByLabelText(doc.action));
  await fireEvent.press(screen.getByText('Send Verification Code'));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  await fireEvent.changeText(screen.getByPlaceholderText('Enter 6-digit code'), '123456');
  await fireEvent.press(screen.getByLabelText(LEGAL_DOCUMENTS[0].action));
  await fireEvent.press(screen.getByText('Complete Registration'));
  expect(mockVerify).not.toHaveBeenCalled();
  expect(mockRegister).not.toHaveBeenCalled();
});
