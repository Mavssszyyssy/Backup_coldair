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

  expect(screen.getByRole('alert')).toHaveTextContent('Recipient name is required.');
  expect(onSave).not.toHaveBeenCalled();
});
