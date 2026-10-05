import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import Checkout from './Checkout';
import { apiRequest } from '../../config/api';
import { alertDialog } from '../../utils/dialog';
const fixture = vi.hoisted(() => ({ cart: [{ id: 'p1', name: 'AC', price: 100, quantity: 1 }], synchronizeAddresses: vi.fn(), getCartTotal: () => 100 }));
vi.mock('../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../utils/dialog', () => ({ alertDialog: vi.fn(), confirmDialog: vi.fn() }));
vi.mock('../../context/CartContext', () => ({ useCart: () => fixture }));
vi.mock('../../context/UserContext', () => ({ useUser: () => fixture }));
vi.mock('../../domain/branches/branchRouting', () => ({ resolveConfiguredBranch: async () => 'Cavite' }));
vi.mock('../common/boutique/BoutiqueHeader', () => ({ default: () => null }));
vi.mock('../common/boutique/BoutiqueFooter', () => ({ default: () => null }));
vi.mock('./AddAddressModal', () => ({ default: ({ onSave, initialAddress }) => <button onClick={() => onSave({})}>{initialAddress ? 'Save edited fixture address' : 'Save fixture address'}</button> }));
it('adding the first address settles without a repeated stock/address request loop', async () => {
  vi.clearAllMocks();
  apiRequest.mockImplementation(async (path, options = {}) => {
    if (apiRequest.mock.calls.length > 15) throw new Error('Repeated-request regression');
    if (path === '/users/addresses') return { addresses: options.method === 'POST' ? [{ id: 'a1', name: 'Test', city: 'Bacoor', province: 'Cavite', region: 'CALABARZON', barangay: 'Molino I', street: 'Test street', postalCode: '4102', phone: '09123456789', isDefault: true }] : [] };
    return { products: [{ id: 'p1', stock: 5 }] };
  });
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /add new address/i }));
  fireEvent.click(screen.getByText('Save fixture address'));
  await screen.findByText('Delivery address saved and ready for checkout.');
  await waitFor(() => expect(fixture.synchronizeAddresses).toHaveBeenCalled());
  expect(alertDialog).toHaveBeenCalledWith({
    title: 'Delivery address added',
    message: 'Your delivery address was added successfully and is ready for checkout.',
    confirmText: 'Done',
  });
  await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
  expect(apiRequest.mock.calls.filter(([path]) => path.startsWith('/products/public')).length).toBeLessThanOrEqual(3);
  expect(apiRequest.mock.calls.filter(([path]) => path === '/users/addresses').length).toBe(2);
});

it('confirms a saved delivery-address change only after the update succeeds', async () => {
  vi.clearAllMocks();
  const address = { id: 'a1', label: 'Home', name: 'Test', city: 'Bacoor', province: 'Cavite', region: 'CALABARZON', barangay: 'Molino I', street: 'Test street', postalCode: '4102', phone: '09123456789', isDefault: true };
  apiRequest.mockImplementation(async (path, options = {}) => {
    if (path === '/users/addresses/a1' && options.method === 'PATCH') return { addresses: [{ ...address, street: 'Updated street' }] };
    if (path === '/users/addresses') return { addresses: [address] };
    return { products: [{ id: 'p1', stock: 5 }] };
  });
  render(<MemoryRouter><Checkout /></MemoryRouter>);
  await screen.findByText('Test street');
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.click(screen.getByText('Save edited fixture address'));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/users/addresses/a1', expect.objectContaining({ method: 'PATCH' })));
  expect(alertDialog).toHaveBeenCalledWith({
    title: 'Delivery address updated',
    message: 'Your delivery address was updated successfully.',
    confirmText: 'Done',
  });
});
