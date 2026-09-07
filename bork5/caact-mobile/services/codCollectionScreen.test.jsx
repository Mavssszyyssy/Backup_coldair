import React from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TaskInformation from '../app/technician/task/[id]/information';
const mockGet = jest.fn();
const mockCollect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'task1' }),
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));
jest.mock('./taskStorage', () => ({ getTaskById: (...args) => mockGet(...args), confirmCodCollection: (...args) => mockCollect(...args), checkInTask: jest.fn(), TASK_STATUS: { PENDING: 'pending', IN_PROGRESS: 'in-progress' } }));
jest.mock('./unitServiceLogStorage', () => ({ getServiceLogsByTask: async () => [] }));
jest.mock('./locationService', () => ({ getCurrentLocationSnapshot: jest.fn() }));
test('cash confirmation is explicit after check-in, then disappears once collected', async () => {
  const task = { id: 'task1', orderId: 'order1', status: 'in-progress', checkIn: { checkedInAt: '2026-09-08', latitude: 14.5, longitude: 121 }, codPayment: { amount: 25000, collectedAt: null } };
  mockGet.mockResolvedValue(task);
  mockCollect.mockResolvedValue({ ...task, codPayment: { amount: 25000, collectedAt: '2026-09-08' } });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><TaskInformation /></SafeAreaProvider>);
  await waitFor(() => expect(screen.getAllByText('Confirm cash collected').length).toBeGreaterThan(0));
  await fireEvent.press(screen.getAllByText('Confirm cash collected').at(-1));
  expect(mockCollect).not.toHaveBeenCalled();
  const buttons = alert.mock.calls.at(-1)[2];
  expect(buttons[0].text).toBe('Not yet');
  await act(async () => { await buttons[1].onPress(); });
  expect(mockCollect).toHaveBeenCalledWith('task1');
  await screen.findByText('Cash collection confirmed');
  expect(screen.queryByText('Confirm cash collected')).toBeNull();
  alert.mockRestore();
});
