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

test('new catalog photo links require a loadable HTTPS image before saving', async () => {
  apiRequest.mockImplementation(async (path) => path === '/products?includeArchived=true'
    ? { products: [] }
    : { product: { id: 'new-product', name: 'New AC', serialUnits: [] } });
  render(<SuperAdminCatalog />);
  await screen.findByText('No active products match this search.');
  fireEvent.change(screen.getByRole('textbox', { name: 'Product name' }), { target: { value: 'New AC' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'SKU' }), { target: { value: 'NEW-AC-1' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Brand' }), { target: { value: 'New Brand' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'AC specification' }), { target: { value: '1.5 HP' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Price (PHP)' }), { target: { value: '20000' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Starting stock' }), { target: { value: '1' } });
  const imageInput = screen.getByRole('textbox', { name: /Image URL/ });
  const submit = screen.getByRole('button', { name: 'Add product and generate serials' });

  fireEvent.change(imageInput, { target: { value: 'https://www.google.com/aclk?ad=1' } });
  fireEvent.click(submit);
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a working direct HTTPS image link');
  expect(apiRequest).not.toHaveBeenCalledWith('/products', expect.anything());

  fireEvent.change(imageInput, { target: { value: 'https://images.example.com/ac?id=1' } });
  fireEvent.click(submit);
  expect(apiRequest).not.toHaveBeenCalledWith('/products', expect.anything());
  fireEvent.load(screen.getByRole('img', { name: 'Product image preview' }));
  fireEvent.click(submit);
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/products', expect.objectContaining({ method: 'POST' })));
  const sent = JSON.parse(apiRequest.mock.calls.find(([path]) => path === '/products')[1].body);
  expect(sent.image).toBe('https://images.example.com/ac?id=1');
});
