import { fireEvent, render, screen } from '@testing-library/react';
import AddAddressModal from './AddAddressModal';

test('renders an accessible address dialog with consistent footer actions', () => {
  const onClose = vi.fn();

  render(<AddAddressModal onClose={onClose} onSave={vi.fn()} />);

  expect(screen.getByRole('dialog', { name: 'Add New Address' })).toBeInTheDocument();

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
