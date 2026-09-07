import React from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { screen, waitFor } from '@testing-library/react-native';
import TechnicianLayout from '../app/technician/_layout';
import { CartProvider } from '../context/CartContext';

const mockUser = { id: 'tech-fixture', role: 'technician', isFirstLogin: true };
jest.mock('../context/UserContext', () => ({ useUserContext: () => ({ current: mockUser, initialized: true, resolveHomeRoute: () => '/technician/oobe' }) }));
jest.mock('../components/technician/TechnicianBottomNav', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));

test.each(['/technician/oobe', '/technician/dashboard'])('first-login technician reaches setup from %s without redirect or cart render loops', async (initialUrl) => {
  await renderRouter({
    _layout: () => <CartProvider><Stack /></CartProvider>,
    'technician/_layout': TechnicianLayout,
    'technician/oobe/index': () => <Text>Technician setup fixture</Text>,
    'technician/dashboard': () => <Text>Dashboard fixture</Text>,
  }, { initialUrl });
  await waitFor(() => expect(screen.getByText('Technician setup fixture')).toBeTruthy());
});
