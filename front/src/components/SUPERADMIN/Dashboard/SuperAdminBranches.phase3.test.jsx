import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import GlobalDialog from '../../common/GlobalDialog';
import { validateEmailForSubmission } from '../../../domain/emailPolicy';
import SuperAdminBranches from './SuperAdminBranches';

const { language } = vi.hoisted(() => ({ language: { value: 'English' } }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage: language.value }) }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../../../domain/emailPolicy', async (original) => ({
  ...(await original()), validateEmailForSubmission: vi.fn(async () => ''),
}));

beforeEach(() => { language.value = 'English'; vi.clearAllMocks(); });

test('removes branch ownership only after confirmation and makes the administrator assignable again', async () => {
  const owner = { id: 'admin-1', name: 'Ana Cruz', assignedBranch: 'Bulacan', activeBranch: 'Bulacan' };
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/users?role=admin') return { users: [owner] };
    if (path === '/branches') return { branches: [{ name: 'Bulacan' }, { name: 'Cavite' }] };
    if (path === '/users/admin-1') {
      const payload = JSON.parse(options.body);
      const assignedBranch = payload.unassignBranch ? '' : payload.assignedBranch;
      return { user: { ...owner, assignedBranch, activeBranch: assignedBranch } };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  render(<><SuperAdminBranches /><GlobalDialog /></>);
  const remove = await screen.findByRole('button', { name: 'Remove assignment' });
  fireEvent.click(remove);
  const confirmation = screen.getByRole('alertdialog', { name: 'Remove branch assignment?' });
  expect(confirmation).toHaveTextContent('Remove Ana Cruz from Bulacan?');
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
  expect(apiRequest).not.toHaveBeenCalledWith('/users/admin-1', expect.anything());
  fireEvent.click(remove);
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove assignment' }));
  expect(await screen.findByText('Branch assignment removed.')).toBeVisible();
  expect(apiRequest).toHaveBeenCalledWith('/users/admin-1', {
    method: 'PATCH', body: JSON.stringify({ unassignBranch: 'Bulacan' }),
  });
  fireEvent.change(screen.getByLabelText('Branch', { exact: true }), { target: { value: 'Cavite' } });
  fireEvent.change(screen.getByLabelText('Responsible administrator'), { target: { value: 'admin-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));
  expect(await screen.findByText('Ana Cruz is now responsible for Cavite.')).toBeVisible();
});

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
  expect(screen.getByLabelText('First name')).toHaveAttribute('maxlength', '20');
  expect(screen.getByLabelText('Last name')).toHaveAttribute('maxlength', '20');
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

test('branch and administrator forms reject repeated text and invalid email before sending a write', async () => {
  apiRequest.mockImplementation(async (path) => path === '/users?role=admin' ? { users: [] } : { branches: [{ name: 'Cavite', coverageAreas: ['cavite'] }] });
  render(<SuperAdminBranches />);
  await screen.findByText('Current ownership');

  fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: 'Qaaaaaaaaa' } });
  fireEvent.change(screen.getByLabelText('Service areas (comma-separated)'), { target: { value: 'Aaaaaaaaaa' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add branch' }));
  expect(screen.getByText('Branch name contains too many repeated characters.')).toBeVisible();
  expect(screen.getByText('A service area contains too many repeated characters.')).toBeVisible();

  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Assssssssss' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Ssssssssss' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ssssssssssssss' } });
  fireEvent.change(screen.getByLabelText('Eligible branch'), { target: { value: 'Cavite' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create administrator' }));
  expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Last name')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('Enter a valid email address.')).toBeVisible();
  expect(validateEmailForSubmission).not.toHaveBeenCalled();
  expect(apiRequest.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});
