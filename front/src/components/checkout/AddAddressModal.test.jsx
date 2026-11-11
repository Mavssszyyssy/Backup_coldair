import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddAddressModal from './AddAddressModal';

vi.mock('../../domain/location/psgcAddressService', () => ({
  psgcRegions: vi.fn(async () => [
    { name: 'Central Luzon', code: '030000000' },
    { name: 'National Capital Region', code: '130000000' },
  ]),
  psgcProvinces: vi.fn(async () => [{ name: 'Bulacan', code: '031400000' }, { name: 'Metro Manila', code: 'region:130000000' }]),
  psgcLocalities: vi.fn(async () => [{ name: 'Taguig', code: '137607000' }]),
  psgcBarangays: vi.fn(async () => [{ name: 'Central Signal Village', code: '137607005' }]),
  resolveSavedAddressCodes: vi.fn(async () => ({})),
}));

test('renders an accessible address dialog with consistent footer actions', () => {
  const onClose = vi.fn();

  render(<AddAddressModal onClose={onClose} onSave={vi.fn()} />);

  expect(screen.getByRole('dialog', { name: 'Add New Address' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Recipient Name/ })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /Address Type/ })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /Region/ })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Street Address/ })).toBeInTheDocument();

  const cancelButton = screen.getByRole('button', { name: 'Cancel' });
  const saveButton = screen.getByRole('button', { name: 'Save Address' });
  expect(cancelButton).toHaveClass('address-editor-button--secondary');
  expect(saveButton).toHaveClass('address-editor-button--primary');

  fireEvent.click(cancelButton);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('keeps address validation in the redesigned dialog', () => {
  const onSave = vi.fn();

  render(<AddAddressModal onClose={vi.fn()} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save Address' }));

  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Please check this address');
  expect(alert).toHaveTextContent('Recipient name is required.');
  expect(alert.closest('.address-editor-body')).toBeNull();
  expect(onSave).not.toHaveBeenCalled();
});

test('allows a visible address error to be dismissed or cleared by editing', () => {
  render(<AddAddressModal onClose={vi.fn()} onSave={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save Address' }));
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss address error' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Save Address' }));
  fireEvent.change(screen.getByPlaceholderText('Home, Office, Condo'), { target: { value: 'Home' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('preserves a valid mobile-saved address and location codes while editing on web', () => {
  const onSave = vi.fn();
  render(<AddAddressModal onClose={vi.fn()} onSave={onSave} initialAddress={{
    label: 'Home', type: 'home', name: 'Customer', phone: '09123456789',
    region: 'National Capital Region', regionCode: '130000000',
    province: 'Metro Manila', provinceCode: 'region:130000000',
    city: 'Taguig', municipalityCode: '137607000',
    barangay: 'Central Signal Village', submunicipalityCode: '137607005',
    street: 'Test street', postalCode: '1630',
  }} />);
  expect(screen.getByDisplayValue('National Capital Region')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Central Signal Village')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Address' }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    regionCode: '130000000', provinceCode: 'region:130000000',
    municipalityCode: '137607000', submunicipalityCode: '137607005',
  }));
});

test('translates supported address controls without translating saved location names', () => {
  render(<AddAddressModal onClose={vi.fn()} onSave={vi.fn()} language="Filipino" initialAddress={{ region: 'Central Luzon', province: 'Bulacan' }} />);
  expect(screen.getByText('Pumili ng Barangay')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Central Luzon')).toBeInTheDocument();
});

test('uses the mobile PSGC location identities for a newly selected address', async () => {
  const onSave = vi.fn();
  render(<AddAddressModal onClose={vi.fn()} onSave={onSave} />);
  await screen.findByRole('option', { name: 'National Capital Region' });
  const selectors = screen.getAllByRole('combobox');
  fireEvent.change(selectors[1], { target: { value: 'National Capital Region' } });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Metro Manila' })).toBeInTheDocument());
  fireEvent.change(selectors[2], { target: { value: 'Metro Manila' } });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Taguig' })).toBeInTheDocument());
  fireEvent.change(selectors[3], { target: { value: 'Taguig' } });
  await waitFor(() => expect(screen.getByRole('option', { name: 'Central Signal Village' })).toBeInTheDocument());
  fireEvent.change(selectors[4], { target: { value: 'Central Signal Village' } });
  fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Customer' } });
  fireEvent.change(screen.getByPlaceholderText('House/Block/Lot No., Street'), { target: { value: 'Test street' } });
  fireEvent.change(screen.getByPlaceholderText('4-digit ZIP code'), { target: { value: '1630' } });
  fireEvent.change(screen.getByPlaceholderText('09XXXXXXXXX'), { target: { value: '09123456789' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Address' }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    regionCode: '130000000', provinceCode: 'region:130000000',
    municipalityCode: '137607000', submunicipalityCode: '137607005',
  }));
});

test('rejects an overlong phone paste instead of silently truncating it', () => {
  const onSave = vi.fn();
  render(<AddAddressModal onClose={vi.fn()} onSave={onSave} initialAddress={{
    name: 'Customer', phone: '09123456789', region: 'Central Luzon', province: 'Bulacan',
    city: 'Taguig', barangay: 'Central Signal Village', street: 'Test street', postalCode: '1630',
  }} />);

  const phone = screen.getByRole('textbox', { name: /Phone Number/ });
  expect(phone).toHaveAttribute('maxlength', '20');
  fireEvent.change(phone, { target: { value: '091234567891234' } });
  expect(phone).toHaveValue('091234567891234');
  fireEvent.click(screen.getByRole('button', { name: 'Save Address' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Phone number must be a valid PH mobile format');
  expect(onSave).not.toHaveBeenCalled();
});
