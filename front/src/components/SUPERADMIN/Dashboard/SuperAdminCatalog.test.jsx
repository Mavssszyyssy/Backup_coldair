import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import SuperAdminCatalog from './SuperAdminCatalog';

const { language } = vi.hoisted(() => ({ language: { value: 'English' } }));
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage: language.value }) }));
vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../../domain/branches/useActiveBranches', () => ({ default: () => ['Bulacan', 'Pampanga'] }));

beforeEach(() => { language.value = 'English'; });

test('archive control confirms, hides active item, and restore returns it', async () => {
  let archived = false;
  apiRequest.mockImplementation(async (path) => {
    if (path === '/products?includeArchived=true') return { products: [{ id: 'product-1', name: 'Window AC', sku: 'AC-1', stock: 3, isActive: !archived }] };
    if (path === '/products/product-1/archive') { archived = true; return { archived: true }; }
    if (path === '/products/product-1/restore') { archived = false; return { archived: false }; }
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<SuperAdminCatalog onCreated={vi.fn()} />);
  expect(await screen.findByText('AC-1 · Active · 3 units retained')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/products/product-1/archive', { method: 'PATCH' }));
  fireEvent.click(screen.getByRole('button', { name: 'Archived Products' }));
  expect(await screen.findByText('AC-1 · Archived · 3 units retained')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/products/product-1/restore', { method: 'PATCH' }));
  fireEvent.click(screen.getByRole('button', { name: 'Active Products' }));
  expect(await screen.findByText('AC-1 · Active · 3 units retained')).toBeInTheDocument();
});

test('catalog search, sorting and pagination keep long lists navigable', async () => {
  apiRequest.mockResolvedValue({ products: Array.from({ length: 12 }, (_, index) => ({ id: `p-${index}`, name: `AC ${String(index).padStart(2, '0')}`, brand: 'Cold Air', sku: `SKU-${index}`, stock: index, isActive: true })) });
  render(<SuperAdminCatalog />);
  expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
  expect(screen.queryByText('AC 11')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('AC 11')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search products' }), { target: { value: 'SKU-11' } });
  expect(screen.getByText('AC 11')).toBeInTheDocument();
  expect(screen.queryByText('Page 1 of 2')).not.toBeInTheDocument();
});

test('catalog actions switch to Filipino while product names remain unchanged', async () => {
  language.value = 'Filipino';
  apiRequest.mockResolvedValue({ products: [{ id: 'product-1', name: 'Window AC', sku: 'AC-1', stock: 3, isActive: true }] });
  render(<SuperAdminCatalog />);
  expect(await screen.findByText('Window AC')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mga Aktibong Produkto' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'I-archive' })).toBeInTheDocument();
});
