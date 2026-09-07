import React from 'react';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { screen, fireEvent } from '@testing-library/react-native';
import { UserProvider } from '../context/UserContext';
import { CartProvider } from '../context/CartContext';
import AuthLayout from '../app/(auth)/_layout';
import Login from '../app/(auth)/login';
import TechnicianLayout from '../app/technician/_layout';
import TechnicianOobe from '../app/technician/oobe/index';
jest.mock('../services/api', () => ({ login: jest.fn().mockResolvedValue({ success: true, token: 'fixture-token', user: { id: 'fixture', username: 'tech.cavite.lebron', role: 'technician', isFirstLogin: true, technicianOnboardedAt: null } }) }));
jest.mock('../services/sessionCache', () => ({ clearOperationalSessionCache: jest.fn().mockResolvedValue() }));
jest.mock('../components/technician/TechnicianBottomNav', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));

test('signing in a new technician opens the actual setup form once', async () => {
  await renderRouter({ _layout: () => <UserProvider><CartProvider><Stack /></CartProvider></UserProvider>,
    '(auth)/_layout': AuthLayout, '(auth)/sign-in': Login,
    'technician/_layout': TechnicianLayout, 'technician/oobe/index': TechnicianOobe,
  }, { initialUrl: '/sign-in' });
  await screen.findByPlaceholderText('you@example.com or your alias');
  await fireEvent.changeText(screen.getByPlaceholderText('you@example.com or your alias'), 'tech.cavite.lebron');
  await fireEvent.changeText(screen.getByDisplayValue(''), 'fixture-password');
  await fireEvent.press(screen.getByText('Sign In'));
  await screen.findByText('Technician Setup');
});
