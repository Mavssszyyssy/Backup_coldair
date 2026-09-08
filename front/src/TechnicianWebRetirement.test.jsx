import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppContent } from './App';

const session = vi.hoisted(() => ({ isAuthenticated: true, loading: false, userRole: 'technician', logout: vi.fn(), hideAuthRequiredPrompt: vi.fn() }));
vi.mock('./context/UserContext', () => ({ useUser: () => session, UserProvider: ({ children }) => children }));
vi.mock('./components/login/Login', () => ({ default: () => <p>Website sign-in fixture</p> }));
function Path() { return <output data-testid="path">{useLocation().pathname}</output>; }
afterEach(cleanup);

test.each(['/tech/dashboard', '/tech/tasks', '/tech/tasks/TSK-1', '/tech/field-registration?serial=QA-123', '/tech/profile', '/tech/profile/edit', '/login'])('retired destination %s displays mobile guidance, with no operational page or redirect loop', async (url) => {
  session.isAuthenticated = true;
  session.userRole = 'technician';
  render(<MemoryRouter initialEntries={[url]}><AppContent /><Path /></MemoryRouter>);
  expect(await screen.findByText('Technician access is mobile-only')).toBeInTheDocument();
  expect(screen.getByTestId('path')).toHaveTextContent('/technician-mobile');
  expect(screen.queryByText('Task Board')).toBeNull();
});

test('technician can leave the guidance screen and return to website sign-in', async () => {
  session.isAuthenticated = true;
  session.logout.mockImplementation(() => { session.isAuthenticated = false; session.userRole = null; });
  render(<MemoryRouter initialEntries={['/technician-mobile']}><AppContent /><Path /></MemoryRouter>);
  fireEvent.click(screen.getByText('Sign out and use another account'));
  expect(session.logout).toHaveBeenCalled();
  expect(await screen.findByText('Website sign-in fixture')).toBeInTheDocument();
  expect(screen.getByTestId('path')).toHaveTextContent('/login');
});
