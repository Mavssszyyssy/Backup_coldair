import { resolveInventoryQrSerial } from './qrLookupService';
import { apiFetch } from '../constants/config';
import { getStoredToken, fetchTask } from './api';
import { getTaskById } from './taskStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
jest.mock('../constants/config', () => ({ apiFetch: jest.fn() }));
jest.mock('./api', () => ({ getStoredToken: jest.fn(), fetchTask: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(() => { jest.clearAllMocks(); getStoredToken.mockResolvedValue('fixture-token'); });

test.each([
  ['QR_UNIT:QRU-FIXTURE|PRODUCT:product1|SKU:AC-1|MODEL:Window', 'QRU-FIXTURE'],
  ['QR_UNIT:QRU-FIXTURE|SERIAL:OLD-TEMPORARY-SERIAL', 'QRU-FIXTURE'],
  ['AC_UNIT:CAACT-FIXTURE', 'CAACT-FIXTURE'],
  ['https://www.coldair-act.online/tech/field-registration?serial=CAACT-FIXTURE', 'CAACT-FIXTURE'],
  ['{"qrUnitId":"QRU-FIXTURE"}', 'QRU-FIXTURE'],
])('resolves persisted and legacy QR format through authoritative inventory: %s', async (payload, key) => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ unit: { serialNumber: 'CAACT-FIXTURE' } }) });
  expect(await resolveInventoryQrSerial(payload)).toBe('CAACT-FIXTURE');
  expect(apiFetch).toHaveBeenCalledWith(`/products/serial/${key}`, expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fixture-token' }) }));
});

test.each([401, 403, 404, 500])('does not silently fall back to catalog or cached unit on lookup failure %s', async (status) => {
  apiFetch.mockResolvedValue({ ok: false, status, json: async () => ({ message: 'Lookup failed' }) });
  await expect(resolveInventoryQrSerial('QR_UNIT:QRU-FIXTURE')).rejects.toThrow('Lookup failed');
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

test('network failure and missing session cannot verify a QR', async () => {
  apiFetch.mockRejectedValueOnce(new Error('Network request failed'));
  await expect(resolveInventoryQrSerial('QR_UNIT:QRU-FIXTURE')).rejects.toThrow('Network request failed');
  getStoredToken.mockResolvedValue(null);
  await expect(resolveInventoryQrSerial('QR_UNIT:QRU-FIXTURE')).rejects.toThrow(/session token/);
});

test('scan assignment refresh refuses a cached task when offline or signed out', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: 'fixture', serialNumbers: ['OLD'] }]));
  fetchTask.mockRejectedValueOnce(new Error('Network request failed'));
  await expect(getTaskById('fixture', { requireOnline: true })).rejects.toThrow('Network request failed');
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  getStoredToken.mockResolvedValue(null);
  await expect(getTaskById('fixture', { requireOnline: true })).rejects.toThrow(/sign in again/);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});

test('scan uses latest assignment and rejects removed access', async () => {
  fetchTask.mockResolvedValueOnce({ success: true, task: { id: 'fixture', serialNumbers: ['NEW'] } });
  expect((await getTaskById('fixture', { requireOnline: true })).serialNumbers).toEqual(['NEW']);
  fetchTask.mockResolvedValueOnce({ success: false, error: 'Task not found' });
  await expect(getTaskById('fixture', { requireOnline: true })).rejects.toThrow('Task not found');
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});
