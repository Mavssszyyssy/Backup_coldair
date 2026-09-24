import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import { apiRequest } from '../../config/api';
vi.mock('../../config/api', () => ({ apiRequest: vi.fn() }));
beforeEach(() => apiRequest.mockReset());

it('uses the same account identifier for recovery-code request and password reset', async () => {
  apiRequest.mockResolvedValue({ message: 'Success' });
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
  expect(screen.queryByText(/SMS verification/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('you@example.com or account.login'), { target: { value: 'tech.cavite.carl' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
  await screen.findByPlaceholderText('123456');
  expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({ channel: 'email', identifier: 'tech.cavite.carl' });
  fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
  const passwords = document.querySelectorAll('input[type="password"]');
  passwords.forEach((input) => fireEvent.change(input, { target: { value: 'StrongPass1.' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset password securely' }));
  await waitFor(() => expect(screen.getByText('Recovery complete')).toBeInTheDocument());
  expect(JSON.parse(apiRequest.mock.calls[1][1].body)).toEqual({ channel: 'email', identifier: 'tech.cavite.carl', code: '123456', newPassword: 'StrongPass1.' });
});

it('marks the password field, not the verification-code field, for an invalid password', async () => {
  apiRequest.mockResolvedValue({ message: 'Success' });
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('you@example.com or account.login'), { target: { value: 'customer@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
  await screen.findByPlaceholderText('123456');
  fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
  const passwords = document.querySelectorAll('input[type="password"]');
  passwords.forEach((input) => fireEvent.change(input, { target: { value: 'weak' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset password securely' }));

  expect(screen.getByText('Six-digit verification code').closest('.bq-input-group')).not.toHaveClass('bq-input--error');
  expect(screen.getByText('New password').closest('.bq-input-group')).toHaveClass('bq-input--error');
});

it('uses the shared demo email with a separate account login ID', async () => {
  apiRequest.mockResolvedValue({ message: 'Success' });
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText('you@example.com or account.login'), {
    target: { value: 'lanlords2025@gmail.com' },
  });
  const accountLogin = await screen.findByPlaceholderText('admin.cavite or tech.cavite.carl');
  fireEvent.change(accountLogin, { target: { value: 'tech.cavite.carl' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));

  await screen.findByPlaceholderText('123456');
  expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({
    channel: 'email',
    identifier: 'lanlords2025@gmail.com',
    accountLoginId: 'tech.cavite.carl',
  });

  fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
  const passwords = document.querySelectorAll('input[type="password"]');
  passwords.forEach((input) => fireEvent.change(input, { target: { value: 'StrongPass1.' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset password securely' }));

  await waitFor(() => expect(screen.getByText('Recovery complete')).toBeInTheDocument());
  expect(JSON.parse(apiRequest.mock.calls[1][1].body)).toEqual({
    channel: 'email',
    identifier: 'lanlords2025@gmail.com',
    accountLoginId: 'tech.cavite.carl',
    code: '123456',
    newPassword: 'StrongPass1.',
  });
});
