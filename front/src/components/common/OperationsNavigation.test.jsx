import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminLayout from '../ADMIN/Common/AdminLayout';
import SuperAdminLayout from '../SUPERADMIN/Common/SuperAdminLayout';

const state = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('../../context/UserContext', () => ({ useUser: () => ({ user: { role: state.role, name: 'Operations User' }, currentLanguage: 'English', logout: vi.fn() }) }));
vi.mock('../ADMIN/Common/AdminNotificationsBell', () => ({ default: () => null }));
vi.mock('../SUPERADMIN/Common/SuperAdminNotificationsBell', () => ({ default: () => null }));

const width = (value) => { Object.defineProperty(window, 'innerWidth', { configurable: true, value }); fireEvent(window, new Event('resize')); };
const show = (role, shared = false) => {
  state.role = role;
  const Layout = role === 'admin' || shared ? AdminLayout : SuperAdminLayout;
  return render(<MemoryRouter initialEntries={[`/${role}/dashboard`]}><Layout title="Dashboard"><p>Page content</p></Layout></MemoryRouter>);
};
beforeEach(() => { window.sessionStorage.clear(); width(1280); });
afterEach(() => { cleanup(); window.sessionStorage.clear(); document.body.style.overflow = ''; });

it.each(['admin', 'superadmin'])('%s restores a collapsed desktop preference after navigating or resizing', (role) => {
  const first = show(role);
  const menu = screen.getByRole('button', { name: 'Toggle menu' });
  expect(menu).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(menu);
  expect(document.getElementById(`${role}-navigation`)).toHaveAttribute('inert');
  first.unmount();
  show(role);
  expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'false');
  width(900);
  fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
  expect(document.body.style.overflow).toBe('hidden');
  width(1280);
  expect(screen.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'false');
  expect(document.body.style.overflow).toBe('');
});

it.each(['admin', 'superadmin'])('%s traps focus in the mobile menu and closes on Escape or navigation', (role) => {
  width(900);
  show(role);
  const toggle = screen.getByRole('button', { name: 'Toggle menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  const close = screen.getByRole('button', { name: 'Close menu' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('button', { name: 'Logout' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(toggle).toHaveFocus();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(document.body.style.overflow).toBe('');
});

it('keeps only the HQ menu when SuperAdmin opens a shared operational module', () => {
  show('superadmin', true);
  expect(screen.getAllByRole('button', { name: 'Toggle menu' })).toHaveLength(1);
  expect(screen.getByRole('navigation', { name: 'Superadmin navigation' })).toBeVisible();
  expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).toBeNull();
  expect(window.sessionStorage.getItem('admin-sidebar-open')).toBeNull();
});

it('lets a confirmation dialog handle keys without closing or stealing focus from it', () => {
  width(390);
  show('superadmin');
  const toggle = screen.getByRole('button', { name: 'Toggle menu' });
  fireEvent.click(toggle);
  const dialog = document.createElement('div');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = '<button>Cancel logout</button>';
  document.body.appendChild(dialog);
  dialog.firstElementChild.focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(dialog.firstElementChild).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  dialog.remove();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
