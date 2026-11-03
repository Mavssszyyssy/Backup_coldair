import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { apiRequest } from '../config/api';
import { CartProvider, useCart } from './CartContext';
import { UserProvider, useUser } from './UserContext';

vi.mock('../config/api', () => ({ apiRequest: vi.fn() }));

function SessionProbe() {
  const { isAuthenticated, logout } = useUser();
  const { cart } = useCart();
  return <>
    <span>{isAuthenticated ? 'signed in' : 'signed out'}</span>
    <span>items: {cart.length}</span>
    <button onClick={logout}>Sign out</button>
  </>;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem('accessToken', 'fixture-token');
  apiRequest.mockReset().mockImplementation(async path => {
    if (path === '/auth/me') return { user: { id: 'customer-1', role: 'customer' } };
    if (path === '/auth/session') return { session: { cart: [{ id: 'unit-1', quantity: 1 }] } };
    return { success: true };
  });
});

test('customer sign-out clears local access and cart and closes the server session', async () => {
  render(<UserProvider><CartProvider><SessionProbe /></CartProvider></UserProvider>);
  expect(await screen.findByText('signed in')).toBeInTheDocument();
  expect(await screen.findByText('items: 1')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Sign out'));
  await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
  expect(screen.getByText('items: 0')).toBeInTheDocument();
  expect(sessionStorage.getItem('accessToken')).toBeNull();
  expect(apiRequest).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({ method: 'POST' }));
});
