import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import AdminSettings from './AdminSettings';

const { updateSettings, appendAuditLog } = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  appendAuditLog: vi.fn(),
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
      preferences: { currency: 'PHP' },
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
  }),
}));

vi.mock('../Common/AdminLayout', () => ({
  default: ({ title, subtitle, children }) => <main><h1>{title}</h1><p>{subtitle}</p>{children}</main>,
}));

vi.mock('../../../utils/auditLogs', () => ({ appendAuditLog }));

beforeEach(() => {
  updateSettings.mockReset();
  updateSettings.mockResolvedValue({});
  appendAuditLog.mockReset();
});

it('shows company, assigned-branch address and authority as non-editable information', () => {
  render(<AdminSettings />);

  expect(screen.getByText('Cold Air Airconditioning Trading')).toBeInTheDocument();
  expect(screen.getByText('Cavite Branch')).toBeInTheDocument();
  expect(screen.getByText('Dasmariñas, Cavite')).toBeInTheDocument();
  expect(screen.queryByText('Bulacan (Main Branch)')).not.toBeInTheDocument();
  expect(screen.getByText('Branch administrator')).toBeInTheDocument();
  expect(screen.getByText('manage_branch_operations')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('saves only database-backed preferences and notification settings', async () => {
  render(<AdminSettings />);

  fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'USD' } });
  fireEvent.click(screen.getByLabelText('Push notifications'));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

  await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
  const payload = updateSettings.mock.calls[0][0];
  expect(payload.preferences).toEqual({ currency: 'USD' });
  expect(payload.notifications.push).toBe(true);
  expect(payload).not.toHaveProperty('general');
  expect(payload).not.toHaveProperty('roles');
  expect(payload).not.toHaveProperty('assignedBranch');
  expect(screen.getByRole('status')).toHaveTextContent('Settings saved successfully.');
});
