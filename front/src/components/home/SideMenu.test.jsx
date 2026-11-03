import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import SideMenu from './SideMenu';

const { language } = vi.hoisted(() => ({ language: { value: 'Filipino' } }));

vi.mock('../../context/UserContext', () => ({
  useUser: () => ({
    user: { name: 'Andrei Tupas', role: 'customer' },
    isAuthenticated: true,
    currentLanguage: language.value,
  }),
}));

afterEach(() => cleanup());

it('switches customer navigation labels with the shared account language without translating the name', () => {
  const view = render(<MemoryRouter><SideMenu isOpen onClose={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Katalogo ng Tindahan')).toBeInTheDocument();
  expect(screen.getByText('Subaybayan ang order, bayad, at paghahatid')).toBeInTheDocument();
  expect(screen.getByText('Andrei Tupas')).toBeInTheDocument();

  language.value = 'English';
  view.rerender(<MemoryRouter><SideMenu isOpen onClose={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Shop Catalog')).toBeInTheDocument();
  expect(screen.getByText('Track orders, payments and delivery')).toBeInTheDocument();
  expect(screen.getByText('Andrei Tupas')).toBeInTheDocument();
});
