import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import SuperAdminSettings from './SuperAdminSettings';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';

vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../context/UserContext', () => ({ useUser: vi.fn() }));

let updatePreferences;

beforeEach(() => {
  apiRequest.mockReset();
  updatePreferences = vi.fn().mockResolvedValue({});
  useUser.mockReturnValue({
    user: {},
    updatePreferences,
    updateSettings: vi.fn().mockResolvedValue({}),
  });
});

test('saves display preferences directly from their card without changing alert settings', async () => {
  apiRequest.mockResolvedValue({ domains: [] });
  useUser.mockReturnValue({
    user: { preferences: { timezone: 'UTC', currency: 'USD' } },
    updatePreferences,
    updateSettings: vi.fn().mockResolvedValue({}),
  });
  render(<MemoryRouter><SuperAdminSettings /></MemoryRouter>);

  fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Filipino' } });
  expect(screen.queryByLabelText('Time zone')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save display preferences' }));

  await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({
    theme: 'dark',
    darkMode: true,
    language: 'Filipino',
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('Display preferences saved to your account.');
});

test('Superadmin manages the system-wide email whitelist through a multi-select dropdown', async () => {
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/system-settings/email-domains' && !options) {
      return { domains: [
        { domain: 'gmail.com', enabled: true, source: 'default' },
        { domain: 'school.edu.ph', enabled: false, source: 'custom' },
      ] };
    }
    if (path === '/system-settings/email-domains' && options?.method === 'PUT') {
      return {
        message: 'Email domain whitelist saved and applied system-wide.',
        domains: JSON.parse(options.body).domains,
      };
    }
    return {};
  });

  render(<MemoryRouter><SuperAdminSettings /></MemoryRouter>);
  const selector = await screen.findByRole('button', { name: /1 active of 2 domains/i });
  fireEvent.click(selector);
  fireEvent.click(screen.getByRole('checkbox', { name: /school.edu.ph/i }));
  fireEvent.change(screen.getByLabelText(/company, organization, or school domain/i), { target: { value: 'Company.COM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add domain' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save email whitelist' }));

  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/system-settings/email-domains', expect.objectContaining({ method: 'PUT' })));
  const saveCall = apiRequest.mock.calls.find(([, options]) => options?.method === 'PUT');
  const savedDomains = JSON.parse(saveCall[1].body).domains;
  expect(savedDomains).toEqual(expect.arrayContaining([
    expect.objectContaining({ domain: 'school.edu.ph', enabled: true }),
    expect.objectContaining({ domain: 'company.com', enabled: true }),
  ]));
  expect(await screen.findByText(/saved and applied system-wide/i)).toBeInTheDocument();
});

test('Filipino preference translates the settings content while preserving saved values', async () => {
  useUser.mockReturnValue({
    user: { preferences: { theme: 'dark', language: 'Filipino' } },
    currentLanguage: 'Filipino',
    updatePreferences,
    updateSettings: vi.fn().mockResolvedValue({}),
  });
  apiRequest.mockResolvedValue({ domains: [] });
  render(<MemoryRouter><SuperAdminSettings /></MemoryRouter>);
  expect(screen.getByText('Mga setting ng executive workspace')).toBeInTheDocument();
  expect(screen.getByLabelText('Tema')).toHaveValue('dark');
  expect(screen.getByLabelText('Wika')).toHaveValue('Filipino');
  expect(screen.getByText('Mga kagustuhan sa alerto')).toBeInTheDocument();
});
