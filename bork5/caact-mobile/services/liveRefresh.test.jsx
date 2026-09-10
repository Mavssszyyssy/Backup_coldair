import { AppState } from 'react-native';
import { startLiveRefresh, LIVE_REFRESH_INTERVAL_MS } from './liveRefresh';
import { notifyNotificationsChanged } from './notificationEvents';

let onState;
let remove;
let stops;
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => {
  jest.useFakeTimers();
  stops = [];
  remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, callback) => {
    onState = callback;
    return { remove };
  });
});
afterEach(() => { stops.forEach(stop => stop()); jest.restoreAllMocks(); jest.useRealTimers(); });
const start = fn => { const stop = startLiveRefresh(fn); stops.push(stop); return stop; };

test('refreshes an open screen, uses silent updates, and responds immediately to push/read events', async () => {
  const load = jest.fn().mockResolvedValue();
  start(load);
  await settle();
  expect(load).toHaveBeenCalledTimes(1);
  expect(load.mock.calls[0][0].background).toBe(false);
  jest.advanceTimersByTime(LIVE_REFRESH_INTERVAL_MS);
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  expect(load.mock.calls[1][0].background).toBe(true);
  notifyNotificationsChanged();
  await settle();
  expect(load).toHaveBeenCalledTimes(3);
});
test('pauses in background, resumes immediately, and stops on screen blur', async () => {
  const load = jest.fn().mockResolvedValue();
  const stop = start(load);
  await settle();
  onState('background');
  jest.advanceTimersByTime(LIVE_REFRESH_INTERVAL_MS * 3);
  notifyNotificationsChanged();
  await settle();
  expect(load).toHaveBeenCalledTimes(1);
  onState('active');
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  const context = load.mock.calls[1][0];
  stop();
  expect(context.isCurrent()).toBe(false);
  jest.advanceTimersByTime(LIVE_REFRESH_INTERVAL_MS);
  notifyNotificationsChanged();
  expect(load).toHaveBeenCalledTimes(2);
  expect(remove).toHaveBeenCalled();
});
test('does not overlap slow requests and retries after a network failure', async () => {
  let finish;
  const load = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue();
  start(load);
  jest.advanceTimersByTime(LIVE_REFRESH_INTERVAL_MS * 3);
  expect(load).toHaveBeenCalledTimes(1);
  notifyNotificationsChanged();
  finish();
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(LIVE_REFRESH_INTERVAL_MS);
  await settle();
  expect(load).toHaveBeenCalledTimes(3);
});
