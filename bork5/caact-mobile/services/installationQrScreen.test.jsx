import React from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AmpRegistrationScreen from '../app/technician/task/[id]/amp-registration';
import { apiFetch } from '../constants/config';
import { getTaskById, registerTaskAmpUnit } from './taskStorage';
jest.mock('../constants/config', () => ({ apiFetch: jest.fn() }));
jest.mock('./api', () => ({ getStoredToken: async () => 'fixture-token', fetchTechnicianUnitHistory: async () => ({ success: false }) }));
jest.mock('./taskStorage', () => ({ getTaskById: jest.fn(), registerTaskAmpUnit: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({ id: 'task1' }), useFocusEffect: (callback) => require('react').useEffect(callback, [callback]) }));
jest.mock('../components/technician/UnitHistoryPanel', () => () => null);
jest.mock('../components/technician/QrCameraScanner', () => ({ onScanned }) => {
  const { Button } = require('react-native');
  return <Button title="Scan fixture QR" onPress={() => onScanned('QR_UNIT:QRU-FIXTURE|PRODUCT:product1|SKU:AC-1|MODEL:Window')} />;
});
jest.mock('../components/ui/BottomSheetSelect', () => ({ onSelect }) => {
  const { Button } = require('react-native');
  return <Button title="Choose 12 square meters" onPress={() => onSelect({ value: 12 })} />;
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const task = (serial = 'CAACT-FIXTURE') => ({ id: 'task1', taskCode: 'TSK-FIXTURE', orderId: 'order1', serialNumbers: [serial], registrationProgress: { totalRequired: 1, totalRegistered: 0, isComplete: false }, ampRegistrations: {} });
let alert;
beforeEach(() => {
  jest.clearAllMocks();
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  getTaskById.mockResolvedValue(task());
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ unit: { serialNumber: 'CAACT-FIXTURE' } }) });
});
afterEach(() => alert.mockRestore());
const mount = async () => {
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><AmpRegistrationScreen /></SafeAreaProvider>);
  await screen.findByText('Scan fixture QR');
};

test.each(['Bulacan', 'Cavite', 'Laguna', 'Bataan', 'Pangasinan', 'Ilocos'])('assigned QR in %s reaches room-size selection and submits the serial, not the QR ID', async (branch) => {
  getTaskById.mockResolvedValue({ ...task(), branch });
  await mount();
  await fireEvent.press(screen.getByText('Scan fixture QR'));
  await screen.findByText('Room capacity check');
  expect(getTaskById).toHaveBeenLastCalledWith('task1', { requireOnline: true });
  expect(alert).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Choose 12 square meters'));
  registerTaskAmpUnit.mockResolvedValue({ task: { ...task(), registrationProgress: { isComplete: true, totalRequired: 1, totalRegistered: 1 } } });
  await fireEvent.press(screen.getByText('Save room size and verify unit'));
  expect(registerTaskAmpUnit).toHaveBeenCalledWith('task1', expect.objectContaining({ serialNumber: 'CAACT-FIXTURE', roomSizeSqm: 12, registrationSource: 'qr_scan' }));
  await screen.findByText('Assigned QR verified');
});

test('a real inventory QR for another assigned unit is still rejected', async () => {
  await mount();
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ unit: { serialNumber: 'OTHER-BRANCH-UNIT' } }) });
  await fireEvent.press(screen.getByText('Scan fixture QR'));
  expect(alert).toHaveBeenCalledWith('Wrong AC unit', expect.any(String));
  expect(screen.queryByText('Room capacity check')).toBeNull();
  expect(registerTaskAmpUnit).not.toHaveBeenCalled();
});

test('an assignment changed since the screen opened cannot verify the old unit', async () => {
  await mount();
  getTaskById.mockResolvedValue(task('REPLACEMENT-UNIT'));
  await fireEvent.press(screen.getByText('Scan fixture QR'));
  expect(alert).toHaveBeenCalledWith('Wrong AC unit', expect.any(String));
  expect(registerTaskAmpUnit).not.toHaveBeenCalled();
});

test('a network error is not misreported as a wrong unit, and scanning can retry', async () => {
  await mount();
  apiFetch.mockRejectedValueOnce(new Error('Network request failed'));
  await fireEvent.press(screen.getByText('Scan fixture QR'));
  expect(alert).toHaveBeenCalledWith('Unable to verify QR', 'Network request failed');
  expect(screen.queryByText('Room capacity check')).toBeNull();
  await fireEvent.press(screen.getByText('Scan fixture QR'));
  await screen.findByText('Room capacity check');
});

test('already verified assignment is not submitted twice', async () => {
  await mount();
  getTaskById.mockResolvedValue({ ...task(), ampRegistrations: { 'CAACT-FIXTURE': { status: 'registered' } } });
  await fireEvent.press(screen.getByText('Scan fixture QR'));
  expect(alert).toHaveBeenCalledWith('Already registered', expect.any(String));
  expect(registerTaskAmpUnit).not.toHaveBeenCalled();
});
