import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import SuperAdminBranches from './SuperAdminBranches';

const { language } = vi.hoisted(() => ({ language: { value: 'English' } }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage: language.value }) }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../../../domain/emailPolicy', () => ({ validateEmailForSubmission: vi.fn(async () => '') }));

beforeEach(() => { language.value = 'English'; });

test('new branch appears for administrator onboarding without fabricated records', async () => {
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/users?role=admin') return { users: [] };
    if (path === '/branches' && !options) return { branches: [{ name: 'Bulacan', active: true, coverageAreas: ['bulacan'], nearbyBranches: [] }] };
    if (path === '/branches' && options?.method === 'POST') return { branch: { name: 'Pampanga', active: true, coverageAreas: ['angeles'], nearbyBranches: [] } };
    if (path === '/users/staff') return { user: { id: 'admin-1', name: 'Ana Cruz', email: 'ana@example.com', assignedBranch: 'Pampanga' }, tempPassword: 'temporary' };
    throw new Error(`Unexpected request: ${path}`);
  });
  render(<SuperAdminBranches />);
  await screen.findByText('Current ownership');
  expect(screen.getByLabelText('First name')).toHaveAttribute('maxlength', '30');
  expect(screen.getByLabelText('Last name')).toHaveAttribute('maxlength', '30');
  fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: 'Pampanga' } });
  fireEvent.change(screen.getByLabelText('Service areas (comma-separated)'), { target: { value: 'Angeles' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add branch' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/branches', expect.objectContaining({ method: 'POST' })));
  expect(await screen.findByText(/Pampanga was created with no inventory/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Cruz' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/users/staff', expect.objectContaining({ method: 'POST' })));
  expect(await screen.findByText(/temporary password securely/i)).toBeInTheDocument();
});

test('branch creation labels are localized without changing branch names', async () => {
  language.value = 'Filipino';
  apiRequest.mockImplementation(async (path) => path === '/users?role=admin' ? { users: [] } : { branches: [{ name: 'Bulacan', coverageAreas: [] }] });
  render(<SuperAdminBranches />);
  expect(await screen.findByText('Kasalukuyang responsable')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Magdagdag ng sangay' })).toBeInTheDocument();
  expect(screen.getAllByText('Bulacan').length).toBeGreaterThan(0);
});

test('shared demo admin creation displays the account-specific login ID', async () => {
  apiRequest.mockImplementation(async (path) => {
    if (path === '/users?role=admin') return { users: [] };
    if (path === '/branches') return { branches: [{ name: 'Laguna', coverageAreas: [] }] };
    if (path === '/users/staff') return { user: { id: 'admin-laguna-id', name: 'New Admin', email: 'lanlords2025@gmail.com', assignedBranch: 'Laguna' }, loginIdentifier: 'admin.laguna', tempPassword: 'temporary' };
    throw new Error(`Unexpected request: ${path}`);
  });
  render(<SuperAdminBranches />);
  await screen.findByText('Current ownership');
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'New' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Admin' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lanlords2025@gmail.com' } });
  fireEvent.change(screen.getByLabelText('Eligible branch'), { target: { value: 'Laguna' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));
  expect(await screen.findByText('admin.laguna')).toBeInTheDocument();
});
