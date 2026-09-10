import * as Notifications from 'expo-notifications';
import { openInitialNotification, listenForNotificationNavigation } from './pushNotificationService';
import { subscribeNotificationChanges } from './notificationEvents';
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), getLastNotificationResponseAsync: jest.fn(), clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(), addNotificationReceivedListener: jest.fn(() => ({remove:jest.fn()})), addNotificationResponseReceivedListener:jest.fn(() => ({remove:jest.fn()})) }));
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

test('receiving a push refreshes the current screen without navigating and removes both listeners on cleanup', () => {
  const changed = jest.fn();
  const unsubscribe = subscribeNotificationChanges(changed);
  const router = {push:jest.fn()};
  const stop = listenForNotificationNavigation(router, 'customer');
  Notifications.addNotificationReceivedListener.mock.calls.at(-1)[0]({request:{content:{}}});
  expect(changed).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
  stop();
  expect(Notifications.addNotificationReceivedListener.mock.results.at(-1).value.remove).toHaveBeenCalled();
  expect(Notifications.addNotificationResponseReceivedListener.mock.results.at(-1).value.remove).toHaveBeenCalled();
  unsubscribe();
});
