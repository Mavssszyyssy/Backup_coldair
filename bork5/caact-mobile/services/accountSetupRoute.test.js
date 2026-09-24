import { requiredSetupRoute } from './accountSetupRoute';
test('technicians replace their first-login password before accessing work', () => {
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: true })).toBe('/technician/oobe');
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: false })).toBeNull();
});
test('customer onboarding remains mandatory until completed', () => {
  expect(requiredSetupRoute({ role: 'customer', customerOnboardedAt: '2026-01-01' })).toBeNull();
  expect(requiredSetupRoute({ role: 'customer' })).toBe('/customer/oobe');
});
