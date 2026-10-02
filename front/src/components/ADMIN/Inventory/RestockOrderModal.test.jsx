import { fireEvent, render, screen } from '@testing-library/react';
import { apiRequest } from '../../../config/api';
import RestockOrderModal from './RestockOrderModal';

vi.mock('../../../config/api', () => ({ apiRequest: vi.fn() }));

test('shows restock validation in a persistent error notice', () => {
  apiRequest.mockResolvedValue({ products: [] });
  const onClose = vi.fn();
  render(<RestockOrderModal isOpen onClose={onClose} onSuccess={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Create Restock Order' }));

  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Please check the restock order');
  expect(alert).toHaveTextContent('Supplier name is required');
  expect(document.body).toContainElement(alert);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
  expect(onClose).not.toHaveBeenCalled();
});
