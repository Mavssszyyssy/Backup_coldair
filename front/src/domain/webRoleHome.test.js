import { expect, test } from 'vitest';
import { getRoleHomePath } from './webRoleHome';

test('technicians are directed to mobile guidance while website roles keep their workspaces', () => {
  expect(getRoleHomePath('technician')).toBe('/technician-mobile');
  expect(getRoleHomePath('admin')).toBe('/admin/dashboard');
  expect(getRoleHomePath('superadmin')).toBe('/superadmin/dashboard');
  expect(getRoleHomePath('customer')).toBe('/shop');
});
