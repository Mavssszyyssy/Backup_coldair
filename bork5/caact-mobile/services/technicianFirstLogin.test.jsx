import React from 'react';
import { Alert, Text } from 'react-native';
import * as api from './api';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { screen, fireEvent } from '@testing-library/react-native';
import { UserProvider } from '../context/UserContext';
import { CartProvider } from '../context/CartContext';
import AuthLayout from '../app/(auth)/_layout';
import Login from '../app/(auth)/login';
import TechnicianLayout from '../app/technician/_layout';
import TechnicianOobe from '../app/technician/oobe/index';
jest.mock('../services/api', () => ({ login: jest.fn().mockResolvedValue({ success: true, token: 'fixture-token', user: { id: 'fixture', username: 'tech.cavite.lebron', role: 'technician', isFirstLogin: true, technicianOnboardedAt: null } }), completeTechnicianOnboarding: jest.fn().mockResolvedValue({ success: true, user: { id: 'fixture', role: 'technician', isFirstLogin: false, technicianOnboardedAt: '2026-09-08' } }) }));
jest.mock('../services/sessionCache', () => ({ clearOperationalSessionCache: jest.fn().mockResolvedValue() }));
jest.mock('../components/technician/TechnicianBottomNav', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(), removeItem: jest.fn().mockResolvedValue() }));

test('technician signs in, replaces initial password, and reaches work without authenticator setup', async () => {
  await renderRouter({ _layout: () => <UserProvider><CartProvider><Stack /></CartProvider></UserProvider>,
    '(auth)/_layout': AuthLayout, '(auth)/sign-in': Login,
    'technician/_layout': TechnicianLayout, 'technician/oobe/index': TechnicianOobe,
    'technician/home': () => <Text>Technician home fixture</Text>,
  }, { initialUrl: '/sign-in' });
  await screen.findByPlaceholderText('you@example.com or your alias');
  await fireEvent.changeText(screen.getByPlaceholderText('you@example.com or your alias'), 'tech.cavite.lebron');
  await fireEvent.changeText(screen.getByDisplayValue(''), 'fixture-password');
  await fireEvent.press(screen.getByText('Sign In'));
  await screen.findByText('Technician Setup');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await fireEvent.changeText(screen.getByLabelText('Contact Number'), '09123456789');
  await fireEvent.changeText(screen.getByLabelText('New Password'), 'lowercase123.');
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'lowercase123.');
  await fireEvent.press(screen.getByText('Save and Continue'));
  expect(alert).toHaveBeenCalledWith('Check your details', expect.stringContaining('uppercase'));
  expect(api.completeTechnicianOnboarding).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('New Password'), 'A'.repeat(22) + 'a1._');
  await fireEvent.press(screen.getByText('Save and Continue'));
  expect(alert).toHaveBeenCalledWith('Check your details', expect.stringContaining('25'));
  expect(api.completeTechnicianOnboarding).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('New Password'), 'Abcdef1#');
  await fireEvent.press(screen.getByText('Save and Continue'));
  expect(alert).toHaveBeenCalledWith('Password mismatch', expect.any(String));
  expect(api.completeTechnicianOnboarding).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'Abcdef1#');
  api.completeTechnicianOnboarding.mockRejectedValueOnce(new Error('Connection interrupted'));
  await fireEvent.press(screen.getByText('Save and Continue'));
  expect(alert).toHaveBeenCalledWith('Setup not completed', 'Connection interrupted');
  expect(screen.getByLabelText('New Password').props.value).toBe('Abcdef1#');
  expect(screen.queryByText('Technician home fixture')).toBeNull();
  await fireEvent.press(screen.getByText('Save and Continue'));
  await screen.findByText('Technician home fixture');
  expect(api.completeTechnicianOnboarding).toHaveBeenCalledWith('fixture-token', { phone: '09123456789', newPassword: 'Abcdef1#' });
  expect(screen.queryByText('Authenticator App Setup')).toBeNull();
  alert.mockRestore();
}, 15000); // Multiple navigation and failed-save steps need more than the unit-test default.
