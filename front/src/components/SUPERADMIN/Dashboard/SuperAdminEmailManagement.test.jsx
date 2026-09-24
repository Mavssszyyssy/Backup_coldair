import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SuperAdminProfile from './SuperAdminProfile';
import SuperAdminBranches from './SuperAdminBranches';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';

vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../context/UserContext', () => ({ useUser: vi.fn() }));

beforeEach(() => {
  apiRequest.mockReset();
  useUser.mockReset();
});

test('superadmin profile submits the edited contact email and refreshes through context', async () => {
  const updateProfile = vi.fn().mockResolvedValue({});
  useUser.mockReturnValue({
    user: { id: 'superadmin-id', name: 'Super Admin', email: 'old@example.com', role: 'superadmin' },
    updateProfile,
    changePassword: vi.fn(),
  });
  render(<MemoryRouter><SuperAdminProfile /></MemoryRouter>);
  const email = screen.getByLabelText(/Email address/);
  expect(email).not.toHaveAttribute('readonly');
  fireEvent.change(email, { target: { value: 'lanlords2025@gmail.com' } });
  fireEvent.click(screen.getByText('Save profile'));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ email: 'lanlords2025@gmail.com' })));
  expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument();
});

describe('administrator email management', () => {
  test('saves an edited admin email and immediately displays the returned account', async () => {
    const admin = { id: 'admin-cavite-id', name: 'Cavite Admin', email: 'admin-cavite@example.com', assignedBranch: 'Cavite' };
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/users?role=admin') return { users: [admin] };
      if (path === '/branches') return { branches: [] };
      if (path === '/users/admin-cavite-id' && options?.method === 'PATCH') {
        return { user: { ...admin, email: 'lanlords2025@gmail.com' } };
      }
      return {};
    });
    render(<SuperAdminBranches />);
    const email = await screen.findByLabelText('Email address');
    fireEvent.change(email, { target: { value: 'lanlords2025@gmail.com' } });
    fireEvent.click(screen.getByText('Save email'));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/users/admin-cavite-id', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ email: 'lanlords2025@gmail.com' }),
    })));
    expect(await screen.findByText(/email was updated successfully/i)).toBeInTheDocument();
    expect(email).toHaveValue('lanlords2025@gmail.com');
  });
});
