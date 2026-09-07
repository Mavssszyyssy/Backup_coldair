import * as Notifications from 'expo-notifications';
import { openInitialNotification } from './pushNotificationService';
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), getLastNotificationResponseAsync: jest.fn(), clearLastNotificationResponseAsync: jest.fn().mockResolvedValue() }));
jest.mock('./api', () => ({ registerPushToken: jest.fn() }));
test('no notification must not navigate away from authentication', async () => {
  Notifications.getLastNotificationResponseAsync.mockResolvedValue(null);
  const router = { push: jest.fn() };
  await openInitialNotification(router, 'customer');
  expect(router.push).not.toHaveBeenCalled();
});
test('opening a real notification consumes the stored response before navigation', async () => {
  Notifications.getLastNotificationResponseAsync.mockResolvedValue({ notification: { request: { content: { data: { route: '/customer/orders' } } } } });
  const router = { push: jest.fn() };
  await openInitialNotification(router, 'customer');
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith('/customer/orders');
});
