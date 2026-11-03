import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import SuperAdminServices from './SuperAdminServices';

let currentLanguage = 'English';
vi.mock('../../../context/UserContext', () => ({ useUser: () => ({ currentLanguage }) }));
vi.mock('../Common/SuperAdminLayout', () => ({ default: ({ title, children }) => <main><h1>{title}</h1>{children}</main> }));
vi.mock('../../ADMIN/Orders/AdminOrders', () => ({ default: () => <div>Orders panel</div> }));
vi.mock('../../ADMIN/Maintenance/AdminMaintenance', () => ({ default: () => <div>Services panel</div> }));
vi.mock('../../ADMIN/Technicians/AdminTechnician', () => ({ default: () => <div>Technicians panel</div> }));
vi.mock('../../ADMIN/ContactMessages/AdminContactMessages', () => ({ default: () => <div>Messages panel</div> }));

test('Super Admin service tabs switch languages without changing the selected section', () => {
  currentLanguage = 'Filipino';
  const view = render(<MemoryRouter initialEntries={['/superadmin/services']}><SuperAdminServices /></MemoryRouter>);
  expect(screen.getByRole('tab', { name: 'Mga Order ng Customer' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('tab', { name: 'Mga Kahilingan sa Serbisyo' }));
  expect(screen.getByText('Services panel')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Mga Kahilingan sa Serbisyo' })).toHaveAttribute('aria-selected', 'true');

  view.unmount();
  currentLanguage = 'English';
  render(<MemoryRouter initialEntries={['/superadmin/services?tab=service-requests']}><SuperAdminServices /></MemoryRouter>);
  expect(screen.getByRole('tab', { name: 'Service Requests' })).toHaveAttribute('aria-selected', 'true');
});
