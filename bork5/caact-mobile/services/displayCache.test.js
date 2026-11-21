import { beginMobileDisplayWrite, invalidateMobileDisplay, readMobileDisplay } from './displayCache';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => invalidateMobileDisplay());
afterEach(() => jest.restoreAllMocks());

test('a return visit reuses its exact account and branch while other scopes load independently', async () => {
  const load = jest.fn().mockResolvedValue({ rows: [1] });
  const first = await readMobileDisplay('/products?branch=Cavite', 'customer-a', load);
  first.rows.push(2);
  expect(await readMobileDisplay('/products?branch=Cavite', 'customer-a', load)).toEqual({ rows: [1] });
  expect(load).toHaveBeenCalledTimes(1);
  await readMobileDisplay('/products?branch=Laguna', 'customer-a', load);
  await readMobileDisplay('/products?branch=Cavite', 'customer-b', load);
  expect(load).toHaveBeenCalledTimes(3);
});

test('expired display is delivered immediately while one shared refresh is still pending', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(50_000);
  await readMobileDisplay('/orders?page=2', 'token', async () => ({ orders: ['old'] }));
  now.mockReturnValue(70_000);
  const refresh = deferred(), load = jest.fn(() => refresh.promise), onCached = jest.fn();
  const a = readMobileDisplay('/orders?page=2', 'token', load, { onCached });
  const b = readMobileDisplay('/orders?page=2', 'token', load);
  expect(onCached).toHaveBeenCalledWith({ orders: ['old'] });
  await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(1);
  refresh.resolve({ orders: ['current'] });
  expect(await a).toEqual({ orders: ['current'] });
  expect(await b).toEqual({ orders: ['current'] });
});

test('record updates invalidate snapshots and reject late fills, including while a write is pending', async () => {
  const late = deferred();
  const original = readMobileDisplay('/tasks', 'tech', () => late.promise);
  await Promise.resolve();
  const finish = beginMobileDisplayWrite('/tasks/123/status');
  await readMobileDisplay('/tasks', 'tech', async () => ({ status: 'during write' }));
  finish();
  late.resolve({ status: 'old' });
  await original;
  const load = jest.fn().mockResolvedValue({ status: 'completed' });
  expect(await readMobileDisplay('/tasks', 'tech', load)).toEqual({ status: 'completed' });
  expect(load).toHaveBeenCalledTimes(1);
});

test('alert updates preserve unrelated screen caches and logout prevents old requests refilling them', async () => {
  const load = jest.fn().mockResolvedValue({ orders: [1] });
  await readMobileDisplay('/orders', 'token', load);
  await readMobileDisplay('/notifications/me', 'token', load);
  const finish = beginMobileDisplayWrite('/notifications/123/archive'); finish();
  await readMobileDisplay('/orders', 'token', load);
  expect(load).toHaveBeenCalledTimes(2);
  await readMobileDisplay('/notifications/me', 'token', load);
  expect(load).toHaveBeenCalledTimes(3);
  const late = deferred(); const request = readMobileDisplay('/units', 'token', () => late.promise);
  await Promise.resolve(); invalidateMobileDisplay(); late.resolve({ units: ['old'] }); await request;
  await readMobileDisplay('/units', 'token', load);
  expect(load).toHaveBeenCalledTimes(4);
});

test('errors and oversized data are not reused, and revalidation overrides the freshness window', async () => {
  const failed = jest.fn().mockResolvedValue({ success: false });
  await readMobileDisplay('/tasks','token',failed); await readMobileDisplay('/tasks','token',failed);
  expect(failed).toHaveBeenCalledTimes(2);
  const load=jest.fn().mockResolvedValue({ value: 1 });
  await readMobileDisplay('/units','token',load); await readMobileDisplay('/units','token',load,{revalidate:true});
  expect(load).toHaveBeenCalledTimes(2);
  const huge=jest.fn().mockResolvedValue({ image: 'x'.repeat(2_000_001) });
  await readMobileDisplay('/large','token',huge); await readMobileDisplay('/large','token',huge);
  expect(huge).toHaveBeenCalledTimes(2);
});
