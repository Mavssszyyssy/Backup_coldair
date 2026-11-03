import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import AdminSerialQr from './AdminSerialQr';

vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ user: { role: 'admin', activeBranch: 'Bulacan' } }) }));
vi.mock('../Common/AdminLayout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('qrcode.react', () => ({ QRCodeCanvas: ({ value }) => <div data-testid="qr-payload">{value}</div> }));

test('registry refresh is read-only, reports unique IDs, and does not regenerate QR labels', async () => {
  apiRequest.mockResolvedValue({ products: [{ id: 'p1', name: 'AC', serialUnits: [
    { qrUnitId: 'U1', serialNumber: 'S1', branch: 'Bulacan' },
    { qrUnitId: 'U2', serialNumber: 'S2', branch: 'Bulacan' },
  ] }] });
  render(<AdminSerialQr />);
  await screen.findByText('S1');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh QR registry' }));
  expect(await screen.findByRole('status')).toHaveTextContent('2 unique Unit IDs');
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(apiRequest).toHaveBeenCalledWith('/products');
  expect(apiRequest.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
});

test('registry warns about duplicate IDs without modifying inventory', async () => {
  apiRequest.mockResolvedValue({ products: [{ id: 'p1', name: 'AC', serialUnits: [
    { qrUnitId: 'U1', serialNumber: 'S1', branch: 'Bulacan' },
    { qrUnitId: 'U1', serialNumber: 'S2', branch: 'Bulacan' },
  ] }] });
  render(<AdminSerialQr />);
  await screen.findByText('S1');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh QR registry' }));
  await waitFor(() => expect(screen.getByText(/1 duplicate QR Unit ID/)).toBeInTheDocument());
  expect(apiRequest.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
});

test('keeps a long product name and each existing QR value with its correct unit', async () => {
  const name = 'Cold Air Extended Window-Type Inverter Air Conditioner 2.5 HP';
  apiRequest.mockResolvedValue({ products: [{ id: 'p1', name, sku: 'AC-25', serialUnits: [
    { qrUnitId: 'UNIT-A', qrCode: 'QR_UNIT:UNIT-A:EXISTING', serialNumber: 'SERIAL-A', branch: 'Bulacan' },
    { qrUnitId: 'UNIT-B', qrCode: 'QR_UNIT:UNIT-B:EXISTING', serialNumber: 'SERIAL-B', branch: 'Bulacan' },
  ] }] });
  render(<AdminSerialQr />);
  expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
  expect(screen.getAllByTestId('qr-payload').map((node) => node.textContent)).toEqual([
    'QR_UNIT:UNIT-A:EXISTING', 'QR_UNIT:UNIT-B:EXISTING',
  ]);
  expect(screen.getByText('SERIAL-A')).toBeInTheDocument();
  expect(screen.getByText('SERIAL-B')).toBeInTheDocument();
});
