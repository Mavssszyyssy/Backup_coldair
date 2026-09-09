import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import OrderSummary from './OrderSummary';

afterEach(cleanup);
const item = { id: 'lg1', name: 'LG Premium Dual Inverter', imageUrl: '/catalog/ac/lg-hsn-ipx.jpg', horsepower: 2.5, price: 46499, quantity: 1 };
const view = (product, onPlaceOrder = vi.fn()) => <OrderSummary cart={[product]} totals={{ subtotal: 46499, vatAmount: 5579.88, deliveryFee: 350, discountAmount: 0, total: 52428.88 }} selectedPayment="cod" onPlaceOrder={onPlaceOrder} />;

it('uses the cart catalog image and keeps checkout totals and action intact', () => {
  const placeOrder = vi.fn();
  render(view(item, placeOrder));
  expect(screen.getByRole('img', { name: item.name })).toHaveAttribute('src', item.imageUrl);
  expect(existsSync(path.resolve('public', item.imageUrl.slice(1)))).toBe(true);
  expect(screen.getByText('Horsepower: 2.5 HP')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  expect(placeOrder).toHaveBeenCalledTimes(1);
});

it('renders an accessible AC icon for old carts without an image', () => {
  render(view({ ...item, imageUrl: '' }));
  expect(screen.getByRole('img', { name: /product image unavailable/ })).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
});

it('handles failed images without a retry loop and loads a changed image source', () => {
  const { rerender } = render(view(item));
  fireEvent.error(screen.getByRole('img', { name: item.name }));
  expect(screen.getByRole('img', { name: /product image unavailable/ })).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
  rerender(view({ ...item, imageUrl: '/catalog/ac/tcl-uje-window.jpg' }));
  expect(screen.getByRole('img', { name: item.name })).toHaveAttribute('src', '/catalog/ac/tcl-uje-window.jpg');
});
