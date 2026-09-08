import React from 'react';
import { Alert, Text } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { screen, fireEvent } from '@testing-library/react-native';
import { apiFetch } from '../constants/config';
import { UserProvider } from '../context/UserContext';
import { CartProvider } from '../context/CartContext';
import AuthLayout from '../app/(auth)/_layout';
import Login from '../app/(auth)/login';
import TechnicianLayout from '../app/technician/_layout';
import TechnicianOobe from '../app/technician/oobe/index';

jest.mock('../constants/config', () => ({ API_BASE: 'https://fixture.invalid/api', apiFetch: jest.fn() }));
jest.mock('../services/sessionCache', () => ({ clearOperationalSessionCache: jest.fn().mockResolvedValue() }));
jest.mock('../components/technician/TechnicianBottomNav', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));

test('real screens, session and API client recover a committed setup after a lost HTTP response', async () => {
  let user = { id: 'tech-fixture', username: 'tech.cavite.fixture', role: 'technician', isFirstLogin: true };
  const response = (status, data) => ({ ok: status < 400, status, json: async () => data });
  const writes = [];
  apiFetch.mockImplementation(async (path, options) => {
    if (path === '/auth/login') return response(200, { token: 'fixture-token', user });
    if (path === '/auth/me') return response(200, { user });
    if (path === '/users/password') {
      writes.push(JSON.parse(options.body));
      if (writes.length === 1) return response(409, { message: 'Phone number is already in use.' });
      user = { ...user, isFirstLogin: false, technicianOnboardedAt: '2026-09-08' };
      throw new Error('Server committed but response was lost');
    }
    throw new Error(`Unexpected fixture request: ${path}`);
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderRouter({
    _layout: () => <UserProvider><CartProvider><Stack /></CartProvider></UserProvider>,
    '(auth)/_layout': AuthLayout, '(auth)/sign-in': Login,
    'technician/_layout': TechnicianLayout, 'technician/oobe/index': TechnicianOobe,
    'technician/home': () => <Text>Technician work home</Text>,
  }, { initialUrl: '/sign-in' });
  await fireEvent.changeText(await screen.findByPlaceholderText('you@example.com or your alias'), 'tech.cavite.fixture');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'initial.fixture');
  await fireEvent.press(screen.getByText('Sign In'));
  await screen.findByText('Technician Setup');
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '09123456789');
  await fireEvent.changeText(screen.getByLabelText('New Password'), 'Abcdef1#');
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'Abcdef1#');
  await fireEvent.press(screen.getByText('Save and Continue'));
  expect(alert).toHaveBeenCalledWith('Setup not completed', 'Phone number is already in use.');
  expect(screen.getByLabelText('New Password').props.value).toBe('Abcdef1#');
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '09987654321');
  await fireEvent.press(screen.getByText('Save and Continue'));
  await screen.findByText('Technician work home');
  expect(writes).toEqual([
    { phone: '09123456789', newPassword: 'Abcdef1#' },
    { phone: '09987654321', newPassword: 'Abcdef1#' },
  ]);
  expect(screen.queryByText('Authenticator App Setup')).toBeNull();
  alert.mockRestore();
}, 15000);
