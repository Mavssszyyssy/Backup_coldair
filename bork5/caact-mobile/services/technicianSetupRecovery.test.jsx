import { apiFetch } from '../constants/config';
import { completeTechnicianOnboarding } from './api';

jest.mock('../constants/config', () => ({ API_BASE: 'https://fixture.invalid/api', apiFetch: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
const completed = { id: 'tech-fixture', role: 'technician', isFirstLogin: false, technicianOnboardedAt: '2026-09-08' };
const response = (status, data) => ({ ok: status < 400, status, json: async () => data });
const payload = { phone: '09123456789', newPassword: 'Abcdef1#' };
beforeEach(() => apiFetch.mockReset());

test('a lost response after the server saves setup is reconciled without writing the password twice', async () => {
  apiFetch.mockRejectedValueOnce(new Error('Response lost'))
    .mockResolvedValueOnce(response(200, { user: completed }));
  const result = await completeTechnicianOnboarding('fixture-token', payload);
  expect(result).toMatchObject({ success: true, user: completed });
  expect(apiFetch.mock.calls.map(([path, options]) => [path, options.method])).toEqual([
    ['/users/password', 'PATCH'], ['/auth/me', 'GET'],
  ]);
  expect(apiFetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fixture-token');
});

test('a retry after completed setup refreshes the session instead of trapping the user at current-password required', async () => {
  apiFetch.mockResolvedValueOnce(response(400, { message: 'Current password and new password are required' }))
    .mockResolvedValueOnce(response(200, { user: completed }));
  expect(await completeTechnicianOnboarding('fixture-token', payload)).toMatchObject({ success: true, user: completed });
});

test.each([
  ['missing user', {}],
  ['unfinished user', { user: { ...completed, isFirstLogin: true } }],
  ['unknown setup status', { user: { ...completed, isFirstLogin: undefined } }],
  ['wrong account role', { user: { ...completed, role: 'customer' } }],
])('a successful HTTP response with %s cannot falsely finish setup', async (_, data) => {
  apiFetch.mockResolvedValueOnce(response(200, data))
    .mockResolvedValueOnce(response(200, { user: { ...completed, isFirstLogin: true } }));
  expect(await completeTechnicianOnboarding('fixture-token', payload)).toMatchObject({ success: false });
});

test('the successful setup response returns immediately without an unnecessary refresh', async () => {
  apiFetch.mockResolvedValueOnce(response(200, { user: completed }));
  expect(await completeTechnicianOnboarding('fixture-token', payload)).toMatchObject({ success: true, user: completed });
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

test('validation rejection preserves the server message when setup really is unfinished', async () => {
  apiFetch.mockResolvedValueOnce(response(409, { message: 'Phone number is already in use.' }))
    .mockResolvedValueOnce(response(200, { user: { ...completed, isFirstLogin: true } }));
  expect(await completeTechnicianOnboarding('fixture-token', payload)).toMatchObject({ success: false, error: 'Phone number is already in use.' });
});

test('an unavailable session check does not invent success or repeat the password write', async () => {
  apiFetch.mockRejectedValue(new Error('Offline'));
  expect(await completeTechnicianOnboarding('fixture-token', payload)).toMatchObject({ success: false });
  expect(apiFetch.mock.calls.filter(([, options]) => options.method === 'PATCH')).toHaveLength(1);
});
