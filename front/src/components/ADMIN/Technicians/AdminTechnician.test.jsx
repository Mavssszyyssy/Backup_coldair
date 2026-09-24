import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import AdminTechnician from './AdminTechnician';
import { apiRequest } from '../../../config/api';
vi.mock('../Common/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ user: { role: 'superadmin', assignedBranch: 'Cavite' } }) }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
beforeEach(() => {
  apiRequest.mockReset().mockImplementation(async (path) => path.startsWith('/users') ? { users: [] } : { tasks: [] });
});

test('staff form preserves dotted names, checks minimum length, and prevents duplicate submission', async () => {
  render(<AdminTechnician />);
  await waitFor(() => expect(screen.getByText('Refresh')).toBeEnabled());
  fireEvent.click(screen.getByText('Add technician'));
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Fixture' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Technician' } });
  fireEvent.change(screen.getByLabelText(/^Login name/), { target: { value: 'j.' } });
  expect(screen.getByLabelText(/^Login name/)).toHaveValue('j.');
  fireEvent.click(screen.getByText('Create technician account'));
  expect(screen.getByText(/at least 2 letters or numbers/)).toBeInTheDocument();
  expect(apiRequest.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(/^Login name/), { target: { value: 'j.delacruz' } });
  fireEvent.change(screen.getByLabelText(/^Service Quota/), { target: { value: '3' } });
  expect(screen.getByText('tech.cavite.j.delacruz')).toBeInTheDocument();
  let finish;
  apiRequest.mockImplementation((path, options) => options?.method === 'POST'
    ? new Promise((resolve) => { finish = resolve; })
    : Promise.resolve(path.startsWith('/users') ? { users: [] } : { tasks: [] }));
  const button = screen.getByText('Create technician account');
  fireEvent.click(button);
  fireEvent.submit(button.closest('form'));
  expect(apiRequest.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  expect(JSON.parse(apiRequest.mock.calls.find(([, options]) => options?.method === 'POST')[1].body).serviceQuota).toBe(3);
  expect(screen.getByText('Close')).toBeDisabled();
  await act(async () => finish({ loginIdentifier: 'tech.cavite.j.delacruz', tempPassword: 'cavite.j.delacruz' }));
  expect(screen.getByText(/was added/)).toBeInTheDocument();
});

test('superadmin can update a technician contact email without changing the login ID', async () => {
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/users?role=technician') return { users: [{ id: 'tech-carl', name: 'Carl Demo', alias: 'tech.cavite.carl', assignedBranch: 'Cavite', accountStatus: 'active', serviceQuota: 3, email: 'old@example.com' }] };
    if (path === '/tasks') return { tasks: [] };
    if (path === '/users/tech-carl' && options?.method === 'PATCH') {
      return { user: { id: 'tech-carl', name: 'Carl Demo', alias: 'tech.cavite.carl', assignedBranch: 'Cavite', accountStatus: 'active', serviceQuota: 3, email: 'lanlords2025@gmail.com' } };
    }
    return {};
  });
  render(<AdminTechnician />);
  const email = await screen.findByLabelText(/Email address/);
  expect(screen.getByText('tech.cavite.carl')).toBeInTheDocument();
  fireEvent.change(email, { target: { value: 'lanlords2025@gmail.com' } });
  fireEvent.click(screen.getByText('Save email'));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/users/tech-carl', expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify({ email: 'lanlords2025@gmail.com' }),
  })));
  expect(await screen.findByText(/email was updated successfully/i)).toBeInTheDocument();
  expect(screen.getByText('tech.cavite.carl')).toBeInTheDocument();
});
