import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { apiRequest } from '../config/api';
import { UserProvider, useUser } from './UserContext';

vi.mock('../config/api', () => ({ apiRequest: vi.fn() }));

const ThemeProbe = () => {
  const { currentTheme } = useUser();
  return <span>{currentTheme}</span>;
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem('accessToken', 'test-token');
  apiRequest.mockReset();
});

afterEach(() => {
  document.body.classList.remove('dark-mode');
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
});

test('restores and applies a saved dark theme for the signed-in account', async () => {
  apiRequest.mockResolvedValue({
    user: {
      id: 'superadmin-1',
      role: 'superadmin',
      preferences: { theme: 'dark', darkMode: true },
    },
  });

  render(<UserProvider><ThemeProbe /></UserProvider>);

  expect(await screen.findByText('dark')).toBeInTheDocument();
  await waitFor(() => {
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(document.body).toHaveClass('dark-mode');
  });
});
