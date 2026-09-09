import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import AmpReportCenter from './AmpReportCenter';
const state = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('../../context/UserContext', () => ({ useUser: () => ({ user: { role: state.role } }) }));
vi.mock('../../config/api', () => ({ apiRequest: vi.fn() }));
afterEach(cleanup);
it.each(['admin', 'superadmin'])('identifies a customer before %s generates a report', role => {
  state.role = role;
  render(<AmpReportCenter units={[{ unitId: 'u1', customerName: 'Sample Customer', modelName: 'AC Model', capacityHp: 2.5, serialNumber: 'SERIAL-1' }]} />);
  expect(screen.getByRole('option', { name: 'Sample Customer · AC Model · 2.5 HP · SERIAL-1' })).toBeTruthy();
});
