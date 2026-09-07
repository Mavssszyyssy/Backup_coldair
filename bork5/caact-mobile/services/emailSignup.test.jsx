import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SignUpStep2 from '../app/(auth)/sign-up/step/2';
const mockRequest = jest.fn();
const mockVerify = jest.fn();
const mockRegister = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn() }), useLocalSearchParams: () => ({ email: 'customer@example.com', name_first: 'Test', name_last: 'Customer', password: 'StrongPass1!' }) }));
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ register: mockRegister }) }));
jest.mock('./api', () => ({ requestVerificationOtp: (...args) => mockRequest(...args), verifyRegistrationOtp: (...args) => mockVerify(...args) }));
beforeEach(() => jest.clearAllMocks());

test('signup verifies email and completes registration after skipping the address', async () => {
  mockRequest.mockResolvedValue({ success: true });
  mockVerify.mockResolvedValue({ success: true, registrationVerificationToken: 'email-proof' });
  mockRegister.mockResolvedValue({ success: true });
  await render(<SignUpStep2 />);
  expect(screen.queryByText(/SMS/)).toBeNull();
  await fireEvent.press(screen.getByText('Send Verification Code'));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ action: 'register_email', channel: 'email', email: 'customer@example.com', phone: '' })));
  await fireEvent.changeText(screen.getByPlaceholderText('Enter 6-digit code'), '123456');
  await fireEvent.press(screen.getByText('Complete Registration'));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ contact_method: 'email', locations: [], registrationVerificationToken: 'email-proof' })));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/customer/oobe', params: { registered: '1' } });
});
