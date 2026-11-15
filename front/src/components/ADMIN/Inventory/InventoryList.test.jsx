import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiRequest } from '../../../config/api';
import GlobalDialog from '../../common/GlobalDialog';
import InventoryList from './InventoryList';

const languageState = vi.hoisted(() => ({ current: 'English' }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../context/UserContext', () => ({
  useUser: () => ({ user: { email: 'superadmin@example.com' }, currentLanguage: languageState.current }),
}));
vi.mock('../../../utils/auditLogs', () => ({ appendAuditLog: vi.fn() }));
const InventoryRouter = ({ children }) => <MemoryRouter initialEntries={['/admin/inventory']}>{children}</MemoryRouter>;

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

afterEach(() => { languageState.current = 'English'; });

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
    { wrapper: InventoryRouter },
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
    { wrapper: InventoryRouter },
  );

  fireEvent.change(screen.getByLabelText('Quantity to add for Samsung Windfree'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add stock' }));

  expect(await screen.findByText('Unable to save stock')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Stock added successfully' })).not.toBeInTheDocument();
});

test('labels low and empty stock using the selected branch threshold', () => {
  const products = [
    { ...product, id: 'low', name: 'Low unit', branchStock: { Cavite: 3, Bulacan: 20 }, branchThresholds: { Cavite: 3 } },
    { ...product, id: 'out', name: 'Empty unit', branchStock: { Cavite: 0, Bulacan: 10 }, branchThresholds: { Cavite: 3 } },
    { ...product, id: 'healthy', name: 'Healthy unit', branchStock: { Cavite: 7, Bulacan: 0 }, branchThresholds: { Cavite: 3 } },
  ];
  const getProductStock = (item) => item.branchStock.Cavite;
  const view = render(<InventoryList products={products} loading={false} branch="Cavite" getProductStock={getProductStock} />, { wrapper: InventoryRouter });
  expect(screen.getByText('Low stock · 3')).toHaveClass('stock-badge--low');
  expect(screen.getByText('Out of stock · 0')).toHaveClass('stock-badge--out');
  expect(screen.getByText('In stock · 7')).not.toHaveClass('stock-badge--low', 'stock-badge--out');
  view.rerender(<InventoryList products={products} loading={false} branch="Cavite" getProductStock={getProductStock} stockFilter="low" />);
  expect(screen.getByText('Low unit')).toBeVisible();
  expect(screen.queryByText('Empty unit')).not.toBeInTheDocument();
});

test('localizes inventory controls without translating product and branch names', () => {
  languageState.current = 'Filipino';
  render(<InventoryList products={[product]} loading={false} branch="Cavite" getProductStock={() => 4} canManageStock />, { wrapper: InventoryRouter });
  expect(screen.getByRole('heading', { name: 'Listahan ng imbentaryo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Magdagdag ng stock' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Lahat ng detalye' })).toBeInTheDocument();
  expect(screen.getByLabelText('Daming idaragdag para sa Samsung Windfree')).toBeInTheDocument();
  expect(screen.getByText('Samsung Windfree')).toBeInTheDocument();
});

test('shows readable prices and links each inventory row to the selected product and branch in the registry', () => {
  render(<InventoryList products={[product, { ...product, id: 'fractional', name: 'Other AC', price: 12500.5 }]} loading={false} branch="Cavite" />, { wrapper: InventoryRouter });
  expect(screen.queryByRole('columnheader', { name: 'Serial / QR' })).not.toBeInTheDocument();
  expect(screen.getByText('PHP 38,895.00')).toBeInTheDocument();
  expect(screen.getByText('PHP 12,500.50')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /View unit records: Samsung Windfree/ }))
    .toHaveAttribute('href', '/admin/inventory?tab=serial-qr&productId=product-1&branch=Cavite');
});

test('builds filter options from current inventory and combines them with search and stock', () => {
  const products = [
    product,
    { ...product, id: 'two', name: 'Samsung Tower', brand: ' samsung ', category: 'floor', specs: '2 HP' },
    { ...product, id: 'three', name: 'LG Window', brand: 'LG', specs: '1.50HP', stock: 0 },
    { ...product, id: 'four', name: 'LG Split', brand: 'LG', category: 'split', specs: '2 HP' },
  ];
  const props = { products, loading: false, branch: 'Cavite', searchQuery: 'lg' };
  const view = render(<InventoryList {...props} stockFilter="out" />, { wrapper: InventoryRouter });
  const brand = screen.getByRole('combobox', { name: 'Brand' });
  expect(within(brand).getAllByRole('option').map((option) => option.textContent)).toEqual(['All brands', 'LG', 'Samsung']);
  fireEvent.change(brand, { target: { value: 'lg' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'window' } });
  expect(screen.getAllByRole('option', { name: '1.5 HP' })).toHaveLength(1);
  fireEvent.change(screen.getByRole('combobox', { name: 'HP / Specs' }), { target: { value: '1.5 hp' } });
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(screen.getByText('LG Window')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'HP / Specs' }), { target: { value: '2 hp' } });
  expect(screen.getByText('No products match the current search and filters.')).toBeInTheDocument();

  view.rerender(<InventoryList {...props} products={[...products, { ...product, id: 'new', brand: 'Carrier' }]} stockFilter="out" />);
  expect(within(brand).getByRole('option', { name: 'Carrier' })).toBeInTheDocument();
});

test('puts refresh above the table and keeps page navigation beside the rows selector', () => {
  const products = Array.from({ length: 12 }, (_, index) => ({
    ...product, id: `product-${index}`, name: `AC ${index}`, brand: index === 0 ? 'Carrier' : 'Samsung',
  }));
  const onRefresh = vi.fn();
  const view = render(<InventoryList products={products} loading={false} onRefresh={onRefresh} />, { wrapper: InventoryRouter });
  const refresh = screen.getByRole('button', { name: 'Refresh' });
  const heading = screen.getByRole('heading', { name: 'Inventory List' });
  expect(heading.parentElement).toContainElement(refresh);
  fireEvent.click(refresh);
  expect(onRefresh).toHaveBeenCalledTimes(1);
  view.rerender(<InventoryList products={products} loading onRefresh={onRefresh} />);
  expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
  view.rerender(<InventoryList products={products} loading={false} onRefresh={onRefresh} />);

  const pagination = within(screen.getByRole('navigation', { name: 'Inventory pagination' }));
  const previous = pagination.getByRole('button', { name: 'Previous' });
  const next = pagination.getByRole('button', { name: 'Next' });
  expect(previous).toBeDisabled();
  fireEvent.click(next);
  expect(pagination.getByText('Page 2 of 2')).toBeInTheDocument();
  expect(next).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Brand' }), { target: { value: 'carrier' } });
  expect(pagination.getByText('Page 1 of 1')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Brand' }), { target: { value: '' } });
  fireEvent.change(pagination.getByRole('combobox', { name: 'Inventory rows per page' }), { target: { value: '25' } });
  expect(pagination.getByText('Showing 1-12 of 12')).toBeInTheDocument();
  expect(next).toBeDisabled();
});
