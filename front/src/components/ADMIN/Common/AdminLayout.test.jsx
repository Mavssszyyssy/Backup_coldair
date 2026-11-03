import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout';

vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ user: { role: 'admin', name: 'Branch Admin' }, logout: vi.fn() }) }));
vi.mock('./AdminNotificationsBell', () => ({ default: () => null }));

const show = () => render(<MemoryRouter><AdminLayout title="Dashboard"><p>Dashboard content</p></AdminLayout></MemoryRouter>);

beforeEach(() => window.sessionStorage.removeItem('admin-sidebar-open'));
afterEach(() => { cleanup(); window.sessionStorage.removeItem('admin-sidebar-open'); });

it('preserves the desktop sidebar choice when an admin page remounts', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  const first = show();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
  expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'true');
  first.unmount();
  show();
  expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'true');
});

it('starts with the navigation closed on a small screen even if desktop was expanded', () => {
  window.sessionStorage.setItem('admin-sidebar-open', 'true');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
  show();
  expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'false');
});
