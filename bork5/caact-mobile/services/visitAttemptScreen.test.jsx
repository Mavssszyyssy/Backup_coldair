import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import VisitAttemptScreen from '../app/technician/task/[id]/visit-attempt';
const mockGet = jest.fn(); const mockSubmit = jest.fn();
jest.mock('./taskStorage', () => ({ getTaskById: (...args) => mockGet(...args), submitVisitAttempt: (...args) => mockSubmit(...args), TASK_STATUS: { IN_PROGRESS: 'In Progress' } }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'task-1' }), useRouter: () => ({ back: jest.fn(), replace: jest.fn() }), useFocusEffect: (cb) => require('react').useEffect(cb, [cb]) }));
jest.mock('../components/technician/VisitProofCapture', () => ({ onChange }) => require('react').createElement(require('react-native').Text, { onPress: () => onChange({ uri: 'data:image/jpeg;base64,photo' }) }, 'Capture test proof'));
beforeEach(() => {
  mockGet.mockReset(); mockSubmit.mockReset(); mockSubmit.mockResolvedValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockGet.mockResolvedValue({ id: 'task-1', taskCode: 'TSK-TEST', status: 'In Progress', checkIn: { checkedInAt: '2026-09-10T02:00:00Z' } });
});
afterEach(() => jest.restoreAllMocks());
test('unattended visit submits explicit outcome, note and photo only after check-in', async () => {
  await render(<VisitAttemptScreen />);
  await screen.findByText(/GPS arrival:/);
  await fireEvent.press(screen.getByText('Close this visit'));
  await fireEvent.changeText(screen.getByPlaceholderText('Describe what happened when you arrived'), 'No one answered.');
  await fireEvent.press(screen.getByText('Capture test proof'));
  await fireEvent.press(screen.getByText('Submit visit attempt'));
  await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('task-1', { outcome: 'close', note: 'No one answered.', photo: { uri: 'data:image/jpeg;base64,photo' }, checkedInAt: '2026-09-10T02:00:00Z' }));
  expect(Alert.alert).toHaveBeenCalledWith('Visit attempt saved', expect.stringContaining('customer request stays open'), expect.any(Array));
});
test('without arrival even filled inputs cannot submit an unattended visit', async () => {
  mockGet.mockResolvedValue({ status: 'In Progress' });
  await render(<VisitAttemptScreen />);
  await screen.findByText('GPS check-in is required first.');
  await fireEvent.press(screen.getByText('Request reschedule'));
  await fireEvent.changeText(screen.getByPlaceholderText('Describe what happened when you arrived'), 'No one answered.');
  await fireEvent.press(screen.getByText('Capture test proof'));
  await fireEvent.press(screen.getByText('Submit visit attempt'));
  expect(mockSubmit).not.toHaveBeenCalled();
});
