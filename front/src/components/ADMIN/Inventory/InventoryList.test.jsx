import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import GlobalDialog from '../../common/GlobalDialog';
import InventoryList from './InventoryList';

vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../context/UserContext', () => ({
  useUser: () => ({ user: { email: 'superadmin@example.com' } }),
}));
vi.mock('../../../utils/auditLogs', () => ({ appendAuditLog: vi.fn() }));
vi.mock('./InventorySerialQrPreview', () => ({ default: () => null }));

const product = {
  id: 'product-1',
  name: 'Samsung Windfree',
  brand: 'Samsung',
  category: 'window',
  specs: '1.5 HP',
  sku: '12345678',
  price: 38895,
  stock: 4,
};

test('shows a success popup after stock is added to the selected branch', async () => {
  apiRequest.mockResolvedValue({ product: { ...product, stock: 6 } });
  const onRefresh = vi.fn();

  render(
    <>
      <GlobalDialog />
      <InventoryList
        products={[product]}
        loading={false}
        onRefresh={onRefresh}
        branch="Cavite"
        getProductStock={() => 4}
        canManageStock
      />
    </>,
  );

  fireEvent.change(screen.getByLabelText('Quantity to add for Samsung Windfree'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add stock' }));

  await waitFor(() => {
    expect(apiRequest).toHaveBeenCalledWith('/products/product-1/stock', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'add', quantity: 2, branch: 'Cavite' }),
    });
  });

  expect(await screen.findByRole('heading', { name: 'Stock added successfully' })).toBeInTheDocument();
  expect(screen.getByText('2 units of Samsung Windfree were added to the Cavite inventory.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Quantity to add for Samsung Windfree')).toHaveValue(null);
});

test('does not show a success popup when the stock update fails', async () => {
  apiRequest.mockRejectedValue(new Error('Unable to save stock'));

  render(
    <>
      <GlobalDialog />
      <InventoryList
        products={[product]}
        loading={false}
        onRefresh={vi.fn()}
        branch="Cavite"
        getProductStock={() => 4}
        canManageStock
      />
    </>,
  );

  fireEvent.change(screen.getByLabelText('Quantity to add for Samsung Windfree'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add stock' }));

  expect(await screen.findByText('Unable to save stock')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Stock added successfully' })).not.toBeInTheDocument();
});
