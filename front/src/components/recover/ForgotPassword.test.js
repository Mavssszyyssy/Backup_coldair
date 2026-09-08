import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import { apiRequest } from '../../config/api';
vi.mock('../../config/api', () => ({ apiRequest: vi.fn() }));

it('uses email for both recovery-code request and password reset', async () => {
  apiRequest.mockResolvedValue({ message: 'Success' });
  render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
  expect(screen.queryByText(/SMS verification/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'customer@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
  await screen.findByPlaceholderText('123456');
  expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual({ channel: 'email', identifier: 'customer@example.com' });
  fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
  const passwords = document.querySelectorAll('input[type="password"]');
  passwords.forEach((input) => fireEvent.change(input, { target: { value: 'StrongPass1.' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset password securely' }));
  await waitFor(() => expect(screen.getByText('Recovery complete')).toBeInTheDocument());
  expect(JSON.parse(apiRequest.mock.calls[1][1].body)).toEqual({ channel: 'email', identifier: 'customer@example.com', code: '123456', newPassword: 'StrongPass1.' });
});
