import { apiFetch } from '../constants/config';
import { beginBackendConnection } from './backendConnectionState';
import { validateHumanText } from '../utils/textFieldValidation';
import { serviceReportError } from './serviceReportValidation';

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('./backendConnectionState', () => ({ beginBackendConnection: jest.fn(), failBackendConnection: jest.fn(), finishBackendConnection: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); });

test('all mobile HTTP callers receive actionable validation errors without network or connection-failure side effects', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockImplementation(() => { throw new Error('Invalid submissions must stay local'); });
  for (const [route, body] of [
    ['/users/profile', { name_first: 'Ehjdhdhshsh' }],
    ['/users/addresses', { street: 'ssd sd' }],
    ['/service-requests/me', { otherIssue: 'jhjhjh' }],
    ['/tasks/t1', { payload: { notes: 'Lorem ipsum dolor sit amet' } }],
    ['/orders/123/cancel-request', { reason: 'ssd sd' }],
    ['/parts-requests', { partName: 'PCB', reason: 'jhjhjh' }],
    ['/ai/customer-chat', { message: 'jhjhjh' }],
  ]) {
    const response = await apiFetch(route, { method: 'POST', body: JSON.stringify(body) });
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: expect.any(String), errors: expect.any(Object) });
  }
  expect(fetch).not.toHaveBeenCalled();
  expect(beginBackendConnection).not.toHaveBeenCalled();
  fetch.mockRestore();
});

test('technician report free text rejects nonsense while retaining actual findings and Taglish', () => {
  expect(serviceReportError('Ehjdhdhshsh', 'Cleaned filter')).toMatch(/meaningful/);
  expect(serviceReportError('Water is leaking from the drain.', 'jhjhjh')).toMatch(/meaningful/);
  expect(serviceReportError('May tagas po sa drain line.', 'Nilinis ang drain at tinesting ang airflow.')).toBe('');
  expect(validateHumanText('R-32 pressure is 120 PSI.')).toBe('');
});
