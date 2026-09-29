import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import RegisterEmailStep from './RegisterEmailStep';
import { apiRequest } from '../../config/api';
vi.mock('../../config/api', () => ({ apiRequest: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it('ignores a legacy SMS choice and requests and verifies email only', async () => {
  const onFieldChange = vi.fn();
  apiRequest.mockImplementation(async (path) => {
    if (path === '/system-settings/email-domains/public') return { activeDomains: ['gmail.com'] };
    if (path === '/auth/verify-otp') return { registrationVerificationToken: 'email-proof' };
    return {};
  });
  render(<RegisterEmailStep formData={{ email: 'customer@gmail.com', verificationChannel: 'sms', phoneVerified: true }} errors={{}} detectedRole="customer" onFieldChange={onFieldChange} onNext={vi.fn()} onBack={vi.fn()} />);
  expect(screen.queryByRole('button', { name: /sms/i })).not.toBeInTheDocument();
  expect(screen.queryByText('Email verified')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /send email code/i }));
  await screen.findByPlaceholderText('000000');
  const requestCall = apiRequest.mock.calls.find(([path]) => path === '/auth/request-otp');
  expect(JSON.parse(requestCall[1].body)).toEqual({ action: 'register_email', channel: 'email', email: 'customer@gmail.com', phone: '' });
  fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
  await waitFor(() => expect(onFieldChange).toHaveBeenCalledWith('emailVerified', true));
  expect(onFieldChange).toHaveBeenCalledWith('registrationVerificationToken', 'email-proof');
  const verifyCall = apiRequest.mock.calls.find(([path]) => path === '/auth/verify-otp');
  expect(JSON.parse(verifyCall[1].body).channel).toBe('email');
});
