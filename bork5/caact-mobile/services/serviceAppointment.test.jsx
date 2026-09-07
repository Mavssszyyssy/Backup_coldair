import { getAllServiceRequests } from './serviceRequestStorage';
import * as api from './api';

jest.mock('./api', () => ({ getStoredToken: jest.fn(), fetchMyServiceRequests: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

test('confirmed date and time survive mobile request normalization', async () => {
  api.getStoredToken.mockResolvedValue('test-token');
  api.fetchMyServiceRequests.mockResolvedValue({ success: true, requests: [{ id: 'visit-1', preferredDate: '2026-09-10', scheduledDate: '2026-09-12', timeSlot: '9:00 AM – 12:00 PM' }, { id: 'visit-2', payload: { scheduledDate: '2026-09-13', timeSlot: '1:00 PM' } }] });
  const visits = await getAllServiceRequests();
  expect(visits[0]).toMatchObject({ preferredDate: '2026-09-10', scheduledDate: '2026-09-12', timeSlot: '9:00 AM – 12:00 PM' });
  expect(visits[1]).toMatchObject({ scheduledDate: '2026-09-13', timeSlot: '1:00 PM' });
});
