import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartProvider, useCart } from './CartContext';
let mockCurrent = { id: 'customer-a', role: 'customer' };
jest.mock('./UserContext', () => ({ useUserContext: () => ({ current: mockCurrent, initialized: true }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));
let cart;
function Consumer() { cart = useCart(); return null; }
const tree = () => <CartProvider><Consumer /></CartProvider>;
beforeEach(() => { jest.clearAllMocks(); mockCurrent = { id: 'customer-a', role: 'customer' }; AsyncStorage.getItem.mockResolvedValue(null); });
test('cart actions stay stable and clearing an empty cart does not trigger new state', async () => {
  await render(tree());
  const initial = cart;
  await act(async () => cart.clearCart());
  expect(cart).toBe(initial);
  await act(async () => cart.addToCart({ id: 'ac1', stock: 3, price: 100 }));
  expect(cart.clearCart).toBe(initial.clearCart);
  expect(cart.replaceCart).toBe(initial.replaceCart);
  const populated = cart;
  await act(async () => cart.replaceCart([...cart.cart]));
  expect(cart).toBe(populated);
});
test('a new customer cannot inherit or persist the previous customer cart', async () => {
  AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{ id: 'ac1', quantity: 1 }]));
  const view = await render(tree());
  expect(cart.cart).toHaveLength(1);
  mockCurrent = { id: 'customer-b', role: 'customer' };
  await view.rerender(tree());
  expect(cart.cart).toEqual([]);
  expect(AsyncStorage.setItem.mock.calls.filter(([key]) => key === 'coldair_cart_v2:customer-b').every(([, value]) => value === '[]')).toBe(true);
});
test('technician login does not hydrate or persist customer shopping state', async () => {
  mockCurrent = { id: 'tech-fixture', role: 'technician' };
  await render(tree());
  expect(cart.hydrated).toBe(true);
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
