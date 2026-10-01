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

test('creates a work order from linked customer, address, unit, service, and technician records', async () => {
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/users?role=technician') return { users: [{ id: 'tech-1', name: 'Carl Ramos', assignedBranch: 'Cavite', accountStatus: 'active' }] };
    if (path === '/users?role=customer') return { users: [{
      id: 'customer-1', name: 'Patrick Cruz', email: 'patrick@example.com', phone: '09123456789',
      assignedBranch: 'Cavite', accountStatus: 'active',
      addresses: [{ _id: 'address-1', label: 'Home', street: '591 Street', city: 'Bacoor', province: 'Cavite', isDefault: true }],
    }] };
    if (path === '/service-requests/catalog') return { offerings: [{ id: 'repair', title: 'Repair', defaultIssueType: 'Repair' }] };
    if (path === '/amp/report-units') return { units: [{ unitId: 'unit-1', customerId: 'customer-1', modelName: 'TCL Window 1.5HP', serialNumber: 'CAACT-001', branch: 'Cavite', installationAddress: '591 Street, Bacoor, Cavite' }] };
    if (path === '/tasks' && options?.method === 'POST') return { task: { id: 'task-new' } };
    if (path === '/tasks') return { tasks: [] };
    return {};
  });

  render(<AdminTechnician />);
  const customerSearch = await screen.findByLabelText('Customer / site');
  fireEvent.change(customerSearch, { target: { value: 'Patrick' } });
  fireEvent.click(await screen.findByRole('option', { name: /Patrick Cruz/ }));
  fireEvent.change(screen.getByLabelText(/Registered AC unit/), { target: { value: 'unit-1' } });
  fireEvent.change(screen.getByLabelText('Work type'), { target: { value: 'repair' } });
  fireEvent.change(screen.getByLabelText('Assign technician'), { target: { value: 'tech-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Assign work order' }));

  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/tasks', expect.objectContaining({ method: 'POST' })));
  const request = apiRequest.mock.calls.find(([path, options]) => path === '/tasks' && options?.method === 'POST');
  expect(JSON.parse(request[1].body)).toMatchObject({
    title: 'Repair - TCL Window 1.5HP',
    issueType: 'Repair',
    serviceId: 'repair',
    customerId: 'customer-1',
    customerName: 'Patrick Cruz',
    addressId: 'address-1',
    address: '591 Street, Bacoor, Cavite',
    unitId: 'unit-1',
    assignedTechnicianId: 'tech-1',
    branch: 'Cavite',
  });
});

test('paginates recent work assignments instead of rendering an unbounded card list', async () => {
  const tasks = Array.from({ length: 5 }, (_, index) => ({
    id: `task-${index + 1}`,
    taskCode: `TSK-${index + 1}`,
    title: `Work item ${index + 1}`,
    customerName: 'Patrick Cruz',
    branch: 'Cavite',
    scheduledDate: '2026-10-01',
    timeSlot: '8:00 AM - 10:00 AM',
    assignedTechnicianName: 'Carl Ramos',
    status: 'completed',
  }));
  apiRequest.mockImplementation(async (path) => {
    if (path.startsWith('/users')) return { users: [] };
    if (path === '/tasks') return { tasks };
    if (path === '/service-requests/catalog') return { offerings: [] };
    if (path === '/amp/report-units') return { units: [] };
    return {};
  });

  render(<AdminTechnician />);
  expect(await screen.findByText('Work item 1')).toBeInTheDocument();
  expect(screen.queryByText('Work item 5')).not.toBeInTheDocument();
  expect(screen.getByText('Showing 1–4 of 5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Work item 5')).toBeInTheDocument();
  expect(screen.queryByText('Work item 1')).not.toBeInTheDocument();
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
});
