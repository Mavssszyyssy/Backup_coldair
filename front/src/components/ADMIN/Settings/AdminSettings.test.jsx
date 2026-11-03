import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import AdminSettings from './AdminSettings';

const { updateSettings, appendAuditLog, languageState } = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  appendAuditLog: vi.fn(),
  languageState: { value: 'English' },
}));

vi.mock('../../../context/UserContext', () => ({
  useUser: () => ({
    user: {
      id: 'admin-cavite',
      name: 'Cavite Admin',
      email: 'admin@example.com',
      role: 'admin',
      assignedBranch: 'Cavite',
      activeBranch: 'Bulacan',
      permissions: ['manage_branch_operations'],
      preferences: { currency: 'PHP', language: languageState.value },
      notifications: {
        email: true,
        inApp: true,
        push: false,
        accountUpdates: true,
        orderUpdates: true,
        serviceUpdates: true,
        systemAlerts: true,
      },
    },
    updateSettings,
    currentLanguage: languageState.value,
  }),
}));

vi.mock('../Common/AdminLayout', () => ({
  default: ({ title, subtitle, children }) => <main><h1>{title}</h1><p>{subtitle}</p>{children}</main>,
}));

vi.mock('../../../utils/auditLogs', () => ({ appendAuditLog }));

beforeEach(() => {
  languageState.value = 'English';
  updateSettings.mockReset();
  updateSettings.mockResolvedValue({});
  appendAuditLog.mockReset();
});

it('shows the admin settings interface in Filipino when that account preference is saved', () => {
  languageState.value = 'Filipino';
  render(<AdminSettings />);
  expect(screen.getByText('Impormasyon ng Kompanya')).toBeInTheDocument();
  expect(screen.getByLabelText('Wika ng interface')).toHaveValue('Filipino');
  expect(screen.getByRole('button', { name: 'I-save ang mga Setting ng Sistema' })).toBeInTheDocument();
});

it('shows company and assigned-branch details without redundant authority panels', () => {
  render(<AdminSettings />);

  expect(screen.getByText('Cold Air Airconditioning Trading')).toBeInTheDocument();
  expect(screen.getByText('Cavite Branch')).toBeInTheDocument();
  expect(screen.getByText('Dasmariñas, Cavite')).toBeInTheDocument();
  expect(screen.queryByText('Bulacan (Main Branch)')).not.toBeInTheDocument();
  expect(screen.queryByText('Role & Permissions')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Currency display preference/)).not.toBeInTheDocument();
});

it('saves only database-backed preferences and alert settings', async () => {
  render(<AdminSettings />);

  fireEvent.change(screen.getByLabelText('Interface language'), { target: { value: 'Filipino' } });
  fireEvent.click(screen.getByLabelText('Push alerts'));
  fireEvent.click(screen.getByRole('button', { name: 'Save System Settings' }));

  await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
  const payload = updateSettings.mock.calls[0][0];
  expect(payload.preferences).toEqual({ language: 'Filipino' });
  expect(payload.notifications.push).toBe(true);
  expect(payload).not.toHaveProperty('general');
  expect(payload).not.toHaveProperty('roles');
  expect(payload).not.toHaveProperty('assignedBranch');
  expect(screen.getByRole('status')).toHaveTextContent('System settings saved successfully.');
});
