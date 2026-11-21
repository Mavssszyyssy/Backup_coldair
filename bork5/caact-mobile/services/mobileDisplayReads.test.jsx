import { apiFetch } from '../constants/config';
import { fetchCustomerAmpUnits, fetchTasks, fetchTask, fetchServiceCatalog } from './api';
import { fetchShopProducts, resolveConfiguredInventoryBranch } from './ecommerceService';
import { invalidateMobileDisplay } from './displayCache';
import { getCustomerServiceHistory } from './customerHistoryService';
import { getServiceRequestsByUser } from './serviceRequestStorage';
import { getAllTasks } from './taskStorage';

jest.mock('../constants/config', () => ({ API_BASE: 'https://fixture.invalid/api', apiFetch: jest.fn() }));
jest.mock('./tokenStorage', () => ({ readAuthToken: jest.fn() }));
jest.mock('./serviceRequestStorage', () => ({ SERVICE_REQUEST_STATUS: {}, getServiceRequestsByUser: jest.fn() }));
jest.mock('./taskStorage', () => ({ TASK_STATUS: { COMPLETED: 'completed' }, getAllTasks: jest.fn() }));
const response = (data) => ({ ok: true, status: 200, json: async () => data });
beforeEach(() => { jest.clearAllMocks(); invalidateMobileDisplay(); });
afterEach(() => jest.restoreAllMocks());

test('screen list caching shares customer and technician reads but detail verification always reaches the API', async () => {
  apiFetch.mockImplementation(async (path) => response(path.startsWith('/tasks?') ? { tasks: [{ id: 'work-1' }] } : path === '/amp/customer/units' ? { units: [{ id: 'unit-1' }] } : { task: { id: 'work-1' } }));
  await Promise.all([fetchCustomerAmpUnits('customer', { display: true }), fetchCustomerAmpUnits('customer', { display: true })]);
  await fetchCustomerAmpUnits('customer', { display: true });
  expect(apiFetch).toHaveBeenCalledTimes(1);
  await fetchCustomerAmpUnits('other-customer', { display: true });
  expect(apiFetch).toHaveBeenCalledTimes(2);
  await fetchTasks('tech', { technicianId: 'one', display: true });
  await fetchTasks('tech', { technicianId: 'one', display: true });
  await fetchTasks('tech', { technicianId: 'two', display: true });
  expect(apiFetch).toHaveBeenCalledTimes(4);
  await fetchTask('tech', 'work-1'); await fetchTask('tech', 'work-1');
  expect(apiFetch).toHaveBeenCalledTimes(6);
});

test('Shop shows its expired snapshot while refreshing, but Buy Now branch and stock checks are live', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(50_000);
  apiFetch.mockImplementation(async (path) => response(path.startsWith('/branches') ? { serviceable: true, branch: 'Cavite' } : { products: [{ id: 'p1', name: 'Inverter', stock: 2, price: 20000 }] }));
  const address = { city: 'Bacoor', province: 'Cavite' };
  await resolveConfiguredInventoryBranch(address, { display: true });
  await resolveConfiguredInventoryBranch(address, { display: true });
  await fetchShopProducts('Cavite', { reuseRecent: true });
  expect(apiFetch).toHaveBeenCalledTimes(2);
  now.mockReturnValue(70_000);
  let finish;
  apiFetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const onCached = jest.fn();
  const loading = fetchShopProducts('Cavite', { reuseRecent: true, onCached });
  expect(onCached).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'p1', stock: 2 })]));
  await Promise.resolve();
  finish(response({ products: [{ id: 'p1', name: 'Inverter', stock: 0 }] }));
  expect((await loading)[0].stock).toBe(0);
  await resolveConfiguredInventoryBranch(address);
  await fetchShopProducts('Cavite'); await fetchShopProducts('Cavite');
  expect(apiFetch).toHaveBeenCalledTimes(6);
});

test('cached service choices are delivered before a slow refresh completes', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(50_000);
  apiFetch.mockResolvedValueOnce(response({ offerings: [{ id: 'cleaning' }] }));
  await fetchServiceCatalog('customer', { display: true });
  now.mockReturnValue(200_000);
  let finish; apiFetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const onCached = jest.fn(); const request = fetchServiceCatalog('customer', { display: true, onCached });
  expect(onCached).toHaveBeenCalledWith({ success: true, offerings: [{ id: 'cleaning' }] });
  await Promise.resolve();
  finish(response({ offerings: [{ id: 'repair' }] }));
  expect(await request).toEqual({ success: true, offerings: [{ id: 'repair' }] });
});

test('independent service history reads start together and retain request-to-task matching', async () => {
  let finish;
  getServiceRequestsByUser.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  getAllTasks.mockResolvedValue([{ id: 'task-1', customerId: 'customer', status: 'completed' }]);
  const history = getCustomerServiceHistory('customer', { display: true });
  expect(getAllTasks).toHaveBeenCalledWith({ sync: true, display: true });
  finish([{ id: 'request-1', linkedTaskId: 'task-1', updatedAt: '2026-11-21' }]);
  expect(await history).toMatchObject({ requests: [{ id: 'request-1' }], completedServices: [{ id: 'task-1' }] });
});
