import { requiredSetupRoute } from './accountSetupRoute';
test('technicians only need to replace their first-login password', () => {
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: true })).toBe('/technician/oobe');
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: false })).toBeNull();
  expect(requiredSetupRoute({ role: 'technician', security: { totpResetRequired: true } })).toBeNull();
});
test('customer authenticator recovery and onboarding remain mandatory', () => {
  expect(requiredSetupRoute({ role: 'customer', customerOnboardedAt: '2026-01-01', security: { totpResetRequired: true } })).toBe('/customer/oobe/reset');
  expect(requiredSetupRoute({ role: 'customer' })).toBe('/customer/oobe');
});
